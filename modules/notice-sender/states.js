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
	async action (context) {}
}

const initializeState = {
	async action (context) /*sender -> context*/ {
		state.connect().then(() => {
			state.load().then(res => {
				context.setState(connectionState);
				context.action();
			}).catch(err => {
				state.save({ status: states.IDLE, msg: '', offset: 0 });
			})
		});
	}
}

// Состяние подключения
const connectionState = {
	async action (context) {
		await repository.connect();
		await repository.skipPlayersIdsQuantity(state.offset);

		if(state.status == states.SENDING){
			context.setState(processingState);
		}else if(state.status == states.ERROR){
			context.setState(processingState);
		}else if(state.status == states.IDLE){
			context.setState(idleState);
		}

		context.action();
	}
}

const processRequestState = {
	async action (context) {
		console.log('---REQUEST---')

		clearTimeout(timeoutID);
		clearImmediate(immediateID);
		
		state.save({ status: state.status, msg: context.message, offset: state.offset});

		if(state.status == states.SENDING){
			await state.save({ status: states.SENDING, msg: context.message, offset: 0});
			await context.setState(cleaningState);
		}else if(state.status == states.ERROR){
			await context.setState(connectionState);
		}else if(state.status == states.IDLE){
			await state.save({ status: states.SENDING, msg: context.message, offset: 0});
			await context.setState(connectionState);
		}

		context.action();
	}
}


// Состояние очистки списка получивших уведомление, переход в это 
// состояние при запросе на новую рассылку
const cleaningState = {
	async action (context) {
		setImmediate(()=>{
			repository.resetPlayersIdsCursor();
			repository.clearReceivedIds();
			context.setState(processingState);
			context.action();
		})
	}
}

// Состояние работы с идентификаторами, получение части идентификаторов 
// из players ids, проверка на конец коллекции, сравнение полученных id 
// с теми, что в коллекции получивших.
const processingState = {
	async action (context) {
		// TODO вынести наверх
		let playersCount = await repository.getPlayersIdsCount();
		let delta = playersCount - state.offset;

		if(delta <= 0){
			context.setState(endState);
			context.action();
			return;
		}

		let limit = delta > idsToTake ? idsToTake : delta;

		playersIds.splice(0);
		playersIds = await repository.getPlayersIdsFrom(limit);
		
		// удаление из списка id игроков тех id, которые получили уедомление
		// можно выключить, все равно при сохранении состояния сохраняется
		// offset коллекции players
		// Отказ от поиска plyaers ids в received с целью оптимизации
		await repository.subtractReceivedFromPlayers(playersIds);

		// если в загруженной части players id все находятся в списке 
		// полуивших, остаемся в нынешнем состоянии, иначе переходим к рассылке
		if(playersIds.length == 0){
			// clearTimeout(timeoutID);
			// clearImmediate(immediateID);

			console.log('===>>>');
			await state.save({ status: state.status, msg: state.msg, offset: state.offset += idsToTake });
			context.setState(processingState);
			context.action();
		}else{
			// clearTimeout(timeoutID);
			// clearImmediate(immediateID);

			context.setState(sendingState);
			context.action();
		}


		// context.setState(sendingState);
		// context.action();
	}
}

// Состояние отправки, взаимоействие с методом-заглушкой сервиса vk, обработка 
// исключений, сохранение текущего состояния, переход на следующую итерацию.
const sendingState = {
	async action (context) {
		VK.sendNotification(playersIds, state.msg)
			.then(response => {
				(async()=>{
					context.setState(processingState);
					logger.info(`Sending successful ${ state.msg } to ${ JSON.stringify(response) }`);

					// Отказ от сохранения plyaers ids в received с целью оптимизации
					 repository.saveReceivedIds(response);
					 state.save({ status: states.SENDING, msg: state.msg, offset: state.offset += idsToTake } );
					sendingInterval.fast();
				})()
			}).catch( err => {
				// (async()=>{
					if(err.message == 'Invalid data'){
						context.setState(processingState);
						logger.error(`Invalid data, failed send ${ state.msg } to : ${ JSON.stringify(playersIds) }`);
						 state.save({ status: state.status, msg: state.msg, offset: state.offset });

						 repository.resetPlayersIdsCursor();
						// await repository.skipPlayersIdsQuantity(state.offset);

						console.log(state.offset);
						sendingInterval.slow();
					}else if(err.message == 'Too frequently'){
						context.setState(processingState);
						console.log(state.offset);

						 repository.resetPlayersIdsCursor();
						// await repository.skipPlayersIdsQuantity(state.offset);

						logger.error(`Too frequently, failed send ${ state.msg } to : ${ JSON.stringify(playersIds) }`);
						sendingInterval.slow();
					}else if(err.message == 'Server fatal error'){
						context.setState(disconnectState);
						console.log(state.offset);

						 repository.resetPlayersIdsCursor();
						// await repository.skipPlayersIdsQuantity(state.offset);

						 state.save({ status: states.ERROR, msg: state.msg, offset: state.offset });
						logger.error(`Server fatal error, failed send ${ state.msg } to : ${ JSON.stringify(playersIds) }`);
					}
				// })()
			});

		immediateID = setImmediate(() => {
		timeoutID = setTimeout(() => { clearTimeout(timeoutID); context.action(); }, sendingInterval.time);
		})
	}
}

// Состояние завершения рассылки
const endState = {
	async action (context) {
		logger.info(`Notification sending complete`);
		await state.save({ status: states.IDLE, msg: '', offset: 0 });
		context.setState(disconnectState);
		context.action();
	}
}

const disconnectState = {
	async action (context) {
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