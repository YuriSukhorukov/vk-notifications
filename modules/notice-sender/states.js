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
	async action (sender) {}
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
		console.log(state.offset);
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
			// await repository.resetPlayersIdsCursor();
			// await repository.skipPlayersIdsQuantity(state.offset);
			// console.log('!!!!!!!!!')
			// await state.save({ status: states.SENDING, msg: sender.message, offset: state.offset});
			await sender.setState(connectionState);
			// console.log('-> connectionState');
		}else if(state.status == states.IDLE){
			await state.save({ status: states.SENDING, msg: sender.message, offset: 0});
			await sender.setState(connectionState);
			// console.log('-> connectionState');
		}
		console.log(sender.message)

		sender.action();
	}
}

// при ошибке нужно сбросить курсор и создать новый


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

		console.log(state.offset);

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
		// 
		// Отказ от поиска plyaers ids в received
		// await repository.subtractReceivedFromPlayers(playersIds);

		// если в загруженной части players id все находятся в списке 
		// полуивших, остаемся в нынешнем состоянии, иначе переходим к рассылке
		// if(playersIds.length == 0){
		// 	await state.save({ status: state.status, msg: state.msg, offset: state.offset += idsToTake });
		// 	sender.setState(processingState);
		// 	sender.action();
		// }else{
			sender.setState(sendingState);
			sender.action();
		// }
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

					// Отказ от сохранения plyaers ids в received
					// await repository.saveReceivedIds(response);
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
					console.log(state.offset);
					sender.setState(disconnectState);
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

// Состояние завершения рассылки
const endState = {
	async action (sender) {
		logger.info(`Notification sending complete`);
		await state.save({ status: states.IDLE, msg: '', offset: 0 });
		state.setState(disconnect);
		state.action();
	}
}

const disconnectState = {
	async action (sender) {
		await repository.disconnect();
	}
}

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