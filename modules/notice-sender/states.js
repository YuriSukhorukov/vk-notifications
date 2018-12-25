const VK = require('./../../mock/vk-api');
const state = require('./../state');
const logger = require('./../logger');
const repository = require('./../repository');
const TimeInterval = require('./../time-interval');
const states = require('./../../config').states;
const {
	idsToTake, 
	delayBetweenRequests, 
	delayBetweenErrors } = require('./../../config').service;

let playersIds = [];
let sendingInterval = new TimeInterval(delayBetweenRequests, delayBetweenErrors);

const idleState = {
	async action () {}
}

const initializeState = {
	async action (sender) /*sender -> context*/ {
		// console.log('initializeState');
		state.connect().then(() => {
			state.load().then(res => {
				// console.log('initializeState');
				sender.setState(connectionState);
				sender.action();
				console.log(state.status);
			}).catch(err => {
				state.save({ status: states.IDLE, msg: '', offset: 0 });
			})
		});
	}
}

// Состяние подключения
const connectionState = {
	async action (sender) {
		// console.log('connectionState');
		await repository.connect();
		await repository.skipPlayersIdsQuantity(state.offset);
		if(state.status == states.SENDING){
			sender.setState(processingState);
			// console.log('-> processingState');
		}else if(state.status == states.ERROR){
			sender.setState(processingState);
			// console.log('-> connectionState');
		}else if(state.status == states.IDLE){
			sender.setState(idleState);
			// console.log('-> connectionState');
		}
		sender.action();
	}
}

const processRequestState = {
	async action (sender) {
		// console.log('processRequestState');
		clearTimeout(timeoutID);
		clearImmediate(immediateID);
		state.save({ status: state.status, msg: sender.message, offset: state.offset});

		if(state.status == states.SENDING){
			await state.save({ status: states.SENDING, msg: sender.message, offset: 0});
			await sender.setState(cleaningState);
			// console.log('-> cleaningState');
		}else if(state.status == states.ERROR){
			// console.log('!!!!!!!!!')
			await state.save({ status: states.SENDING, msg: sender.message, offset: state.offset});
			await sender.setState(processingState);
			// console.log('-> connectionState');
		}else if(state.status == states.IDLE){
			await state.save({ status: states.SENDING, msg: sender.message, offset: state.offset});
			await sender.setState(processingState);
			// console.log('-> connectionState');
		}
		console.log(sender.message)

		sender.action();
	}
}

// Состояние завершения рассылки
const endState = {
	async action (sender) {
		// console.log('endState');
		logger.info(`Notification sending complete`);

		await repository.disconnect();
		await state.save({ status: states.IDLE, msg: '', offset: 0 });
	}
}

// Состояние очистки списка получивших уведомление, переход в это 
// состояние при запросе на новую рассылку
const cleaningState = {
	async action (sender) {
		// console.log('cleaningState');
		await repository.resetPlayersIdsCursor();
		await repository.clearReceivedIds();
		// await repository.skipPlayersIdsQuantity(state.offset);
		sender.setState(processingState);
		// sender.setState(connectionState);
		sender.action();
	}
}

// Состояние работы с идентификаторами, получение части идентификаторов 
// из players ids, проверка на конец коллекции, сравнение полученных id 
// с теми, что в коллекции получивших.
const processingState = {
	async action (sender) {
		// console.log('processingState');
		let playersCount = await repository.getPlayersIdsCount();
		let delta = playersCount - state.offset;

		// console.log(state.offset);

		if(delta <= 0){
			sender.setState(endState);
			sender.action();
			return;
		}

		let limit = delta > idsToTake ? idsToTake : delta;

		playersIds.splice(0);
		playersIds = await repository.getPlayersIdsFrom(limit);
		
		// удаление из списка id игроков тех id, которые получили уедомление
		// можно выключить, все равно при сохранении состояния сохраняется
		// offset коллекции players
		await repository.subtractReceivedFromPlayers(playersIds);

		// если в загруженной части players id все находятся в списке 
		// полуивших, остаемся в нынешнем состоянии, иначе переходим к рассылке
		if(playersIds.length == 0){
			// console.log('-> processingState');
			await state.save({ status: state.status, msg: state.msg, offset: state.offset += idsToTake });
			sender.setState(processingState);
			sender.action();
		}else{
			// console.log('-> sendingState');
			sender.setState(sendingState);
			sender.action();
		}
	}
}

// Состояние отправки, взаимоействие с методом-заглушкой сервиса vk, обработка 
// исключений, сохранение текущего состояния, переход на следующую итерацию.
const sendingState = {
	async action (sender) {
		// console.log('sendingState');
		VK.sendNotification(playersIds, state.msg)
			.then(response => {
				(async () => {
					sender.setState(processingState);
					logger.info(`Sending successful ${ state.msg } to ${ JSON.stringify(response) }`);
					await repository.saveReceivedIds(response);
					await state.save({ status: state.status, msg: state.msg, offset: state.offset += idsToTake } );
					sendingInterval.fast();
				})()
			}).catch( err => {
				if(err.message == 'Invalid data'){
					sender.setState(processingState);
					logger.error(`Invalid data, failed send ${ state.msg } to : ${ JSON.stringify(playersIds) }`);
					state.save({ status: state.status, msg: state.msg, offset: state.offset });
					sendingInterval.slow();
				}else if(err.message == 'Too frequently'){
					sender.setState(processingState);
					logger.error(`Too frequently, failed send ${ state.msg } to : ${ JSON.stringify(playersIds) }`);
					sendingInterval.slow();
				}else if(err.message == 'Server fatal error'){
					sender.setState(idleState);
					state.save({ status: states.ERROR, msg: state.msg, offset: state.offset });
					logger.error(`Server fatal error, failed send ${ state.msg } to : ${ JSON.stringify(playersIds) }`);
				}
			});

		immediateID = setImmediate(()=>{
			timeoutID = setTimeout(()=>{ clearTimeout(timeoutID); sender.action(); }, sendingInterval.time);
		})
	}
}

let timeoutID;
let immediateID;

const st = {
	idleState,
	initializeState,
	processRequestState,
	endState,
	connectionState,
	cleaningState,
	processingState,
	sendingState,
}

module.exports = st;