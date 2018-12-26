const VK = require('./../../mock/vk-api');
const state = require('./../state');
const logger = require('./../logger');
const repository = require('./../repository');
const TimeInterval = require('./../time-interval');
const statuses = require('./../../config').statuses;
const {
	idsToTake, 
	delayBetweenRequests, 
	delayBetweenErrors } = require('./../../config').service;

let playersCount;
let playersIds = [];
let sendingInterval = new TimeInterval(delayBetweenRequests, delayBetweenErrors);

const idleState = {
	async action (context) {}
}

const initializeState = {
	async action (context) {
		state.connect().then(() => {
			state.load().then(res => {
				context.setState(connectionState);
				context.action();
			}).catch(err => {
				state.save({ status: statuses.IDLE, msg: '', offset: 0 });
			})
		});
	}
}

const connectionState = {
	async action (context) {
		await repository.connect();
		await repository.skipPlayersIdsQuantity(state.offset);
		
		playersCount = await repository.getPlayersIdsCount();

		if(state.status == statuses.SENDING){
			context.setState(processingState);
		}else if(state.status == statuses.ERROR){
			context.setState(processingState);
		}else if(state.status == statuses.IDLE){
			context.setState(idleState);
		}

		context.action();
	}
}

const processRequestState = {
	async action (context) {
		clearTimeout(timeoutID);
		clearImmediate(immediateID);
		
		state.save({ status: state.status, msg: context.message, offset: state.offset});

		if(state.status == statuses.SENDING){
			await state.save({ status: statuses.SENDING, msg: context.message, offset: 0});
			context.setState(cleaningState);
		}else if(state.status == statuses.ERROR){
			context.setState(connectionState);
		}else if(state.status == statuses.IDLE){
			await state.save({ status: statuses.SENDING, msg: context.message, offset: 0});
			context.setState(connectionState);
		}

		context.action();
	}
}

// Состояние работы с идентификаторами, получение части идентификаторов 
// из players ids, проверка на конец коллекции, сравнение полученных id 
// с теми, что в коллекции получивших.
const processingState = {
	async action (context) {
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
		await repository.subtractReceivedFromPlayers(playersIds);

		// если в загруженной части players id все находятся в списке 
		// полуивших, остаемся в нынешнем состоянии, иначе переходим к рассылке
		if(playersIds.length == 0){
			await state.save({ status: state.status, msg: state.msg, offset: state.offset += idsToTake });
			context.setState(processingState);
		}else{
			context.setState(sendingState);
		}

		context.action();
	}
}

// Состояние отправки, взаимоействие с методом-заглушкой сервиса vk, обработка 
// исключений, сохранение текущего состояния, переход на следующую итерацию.
const sendingState = {
	async action (context) {
		VK.sendNotification(playersIds, state.msg)
			.then(response => {
				(async () => {
					context.setState(processingState);
					logger.info(`Sending successful ${ state.msg } to ${ JSON.stringify(response) }`);
					repository.saveReceivedIds(response);
					state.save({ status: statuses.SENDING, msg: state.msg, offset: state.offset += idsToTake } );
					sendingInterval.fast();
				})()
			}).catch( err => {
				if(err.message == 'Invalid data'){
					context.setState(processingState);
					logger.error(`Invalid data, failed send ${ state.msg } to : ${ JSON.stringify(playersIds) }`);
					state.save({ status: state.status, msg: state.msg, offset: state.offset });
				 	repository.resetPlayersIdsCursor();
					sendingInterval.slow();
				}else if(err.message == 'Too frequently'){
					context.setState(processingState);
					repository.resetPlayersIdsCursor();
					logger.error(`Too frequently, failed send ${ state.msg } to : ${ JSON.stringify(playersIds) }`);
					sendingInterval.slow();
				}else if(err.message == 'Server fatal error'){
					context.setState(disconnectState);
					repository.resetPlayersIdsCursor();
					state.save({ status: statuses.ERROR, msg: state.msg, offset: state.offset });
					logger.error(`Server fatal error, failed send ${ state.msg } to : ${ JSON.stringify(playersIds) }`);
				}
			});

		immediateID = setImmediate(() => {
			timeoutID = setTimeout(() => { clearTimeout(timeoutID); context.action(); }, sendingInterval.time);
		})
	}
}

let immediateID;
let timeoutID;

// Состояние завершения рассылки
const endState = {
	async action (context) {
		logger.info(`Notification sending complete`);
		await state.save({ status: statuses.IDLE, msg: '', offset: 0 });
		context.setState(disconnectState);
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

const disconnectState = {
	async action (context) {
		await repository.disconnect();
	}
}

const states = {
	idleState,
	initializeState,
	processRequestState,
	endState,
	connectionState,
	cleaningState,
	processingState,
	sendingState,
}

module.exports = states;
