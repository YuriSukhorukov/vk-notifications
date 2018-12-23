let express = require('express');
let VK = require('./mock/vk-api');
let state = require('./modules/state');
let logger = require('./modules/winston');
let repository = require('./modules/repository');
let TimeInterval = require('./modules/time-interval');
const {port} = require('./config').app;
const states = require('./config').states;

let app = express();

let page = 0;
let nPerPage = 100;
 
let sendingInterval = new TimeInterval(400, 1000);

repository.connect();
state.connect().then(() => {
	state.load().then(res => {
		console.log(res)
		if(state.status == states.SENDING || state.status == states.ERROR){
			notice.state = sending;
			notice.send();
			// sendNotification(state.msg, false);
		}
	}).catch(err => {
		state.save({ status: states.IDLE, msg: '' });
	})
})

// точка входа - один раз
// обработка данных - несколько раз
// 

// async function sendNotification(message = '', isNewNotice = true){
// 	br = false;

// 	await repository.connect();
// 	if(isNewNotice === true)
// 		await repository.clearReceivedIds();

// 	page = 0;

// 	console.log('! ', message)
// 	logger.info(`Notification started with message: ${ message }`);

// 	await state.save({ status: states.SENDING, msg: message});
// 	await sendLoop(message);
// }
// let br = false;
// async function sendLoop(){
// 	if(br === true)
// 		return;
// 	console.log('...data', state.msg);
// 	// db.collection('received').drop();
// 	// db.collection('players').drop();
// 	// let newPlayers = await insertMock();

// 	let playersCount = await repository.getPlayersIdsCount();
// 	let delta = playersCount - page * nPerPage
	
// 	if(delta <= 0){
// 		page = 0;
// 		await state.save({status: states.IDLE, msg: ''});
// 		await repository.disconnect();
// 		logger.info(`Notification sending complete`);
// 		return;
// 	}

// 	let limit = 0;
// 	if(delta > nPerPage)
// 		limit = nPerPage;
// 	else
// 		limit = delta;

// 	let playersIds = await repository.getPlayersIdsFrom(page, nPerPage, limit);

// 	console.log('delta', delta, page);
	
// 	await repository.subtractReceivedFromPlayers(playersIds);

// 	if(playersIds.length == 0){
// 		page++;
// 		setImmediate(sendLoop);
// 		return;
// 	}

// 	VK.sendNotification(playersIds, state.msg)
// 	.then(response => {
// 		(async () => {
// 			page++;
// 			logger.info(`Successful notification for: ${JSON.stringify(response)}`);
// 			await repository.saveReceivedIds(response);
// 			sendingInterval.fast();
// 			console.log('SENDED');
// 		})()
// 	}).catch( err => {
// 		if(err.message == 'Invalid data'){
// 			page++;
// 			sendingInterval.slow();
// 			logger.error('Invalid data');
// 		}else if(err.message == 'Too frequently'){
// 			sendingInterval.slow();
// 			logger.error('Too frequently');
// 		}else if(err.message == 'Server fatal error'){
// 			logger.error('Server fatal error');
// 			state.save({status: states.ERROR, msg: ''});
// 			br = true;
// 			return;
// 		}
// 	})
// 	setTimeout(sendLoop, sendingInterval.time);
// }


const idle = {
	async send() {
		console.log('connect');
	}
}

const connect = {
	async send () {
		console.log('connect');

		// await repository.connect();
		logger.info(`Notification started with message: ${ state.msg }`);
		let receivedIdsCount = await repository.getReceivedIdsCount();
		// await state.save({ status: states.SENDING, msg: state.msg});

		notice.state = clearRecieved;
		notice.send();
	}
}

let playersIds = [];

const processIds = {
	async send () {
		console.log('sending');
		playersIds.splice(0);
		let playersCount = await repository.getPlayersIdsCount();
		let delta = playersCount - page * nPerPage

		if(delta <= 0){
			page = 0;
			await state.save({status: states.IDLE, msg: ''});
			// await repository.disconnect();
			logger.info(`Notification sending complete`);
			return;
		}

		let limit = 0;
		if(delta > nPerPage)
			limit = nPerPage;
		else
			limit = delta;

		playersIds = await repository.getPlayersIdsFrom(page, nPerPage, limit);

		console.log('delta', delta, page);
		
		await repository.subtractReceivedFromPlayers(playersIds);

		// if(playersIds.length == 0){
		// 	page++;
		// 	setImmediate(sendLoop);
		// 	return;
		// }

		notice.state = checkIds;
		notice.send();
	}
}

const checkIds = {
	async send(){
		if(playersIds.length == 0){
			page++;
			notice.state = processIds;
			notice.send();
		}else{
			notice.state = sending;
			notice.send();
		}
	}
}

const clearRecieved = {
	async send(){
		console.log('clear')
		await repository.clearReceivedIds();
		notice.state = processIds;
		notice.send();
	}
}


const sending = {
	async send() {
		VK.sendNotification(playersIds, state.msg)
			.then(response => {
				(async () => {
					page++;
					logger.info(`Successful notification for: ${JSON.stringify(response)}`);
					await repository.saveReceivedIds(response);
					sendingInterval.fast();
					console.log('SENDED');
					notice.state = processIds;
				})()
			}).catch( err => {
				if(err.message == 'Invalid data'){
					page++;
					sendingInterval.slow();
					logger.error('Invalid data');

					notice.state = processIds;
				}else if(err.message == 'Too frequently'){
					sendingInterval.slow();
					logger.error('Too frequently');

					notice.state = processIds;
				}else if(err.message == 'Server fatal error'){
					logger.error('Server fatal error');
					state.save({status: states.ERROR, msg: ''});
					br = true;

					notice.state = idle;
				}
			})

			setTimeout(()=>{notice.send();}, sendingInterval.time);
	}
}

const notice = {
	state: idle,
	send(){
		this.state.send();
	}
}


// setTimeout(()=>{notice.state = sending}, 4000);
// // 
// setInterval(()=>{requests = 0}, 1000)


// async function startNotificationSending (message = '', isNewNotice = true) {
// 	await repository.connect();
// 	page = 0;

// 	console.log('! ', message)
// 	logger.info(`Notification started with message: ${ message }`);

// 	if(isNewNotice === true){
// 		let receivedIdsCount = await repository.getReceivedIdsCount();
// 		if(receivedIdsCount > 0)
// 			await repository.clearReceivedIds(); // очищается даже когда возобновляется работа упавшего
// 	}
// 	await state.save({ status: states.SENDING, msg: message});
// 	await processIds(message);
// }

// async function processIds () {
// 	console.log('...data', state.msg);

// 	let playersCount = await repository.getPlayersIdsCount();
// 	let delta = playersCount - page * nPerPage
	
// 	if(delta <= 0){
// 		page = 0;
// 		await state.save({status: states.IDLE, msg: ''});
// 		// await repository.disconnect();
// 		logger.info(`Notification sending complete`);
// 		return;
// 	}

// 	let limit = 0;
// 	if(delta > nPerPage)
// 		limit = nPerPage;
// 	else
// 		limit = delta;

// 	let playersIds = await repository.getPlayersIdsFrom(page, nPerPage, limit);

// 	console.log('delta', delta, page);
	
// 	await repository.subtractReceivedFromPlayers(playersIds);

// 	if(playersIds.length == 0){
// 		page++;
// 		setImmediate(processIds);
// 		return;
// 	}else{
// 		await sendNotificaions();
// 	}
// }

// async function sendNotificaions () {
// 	VK.sendNotification(playersIds, state.msg)
// 		.then(response => {
// 			(async () => {
// 				page++;
// 				logger.info(`Successful notification for: ${JSON.stringify(response)}`);
// 				await repository.saveReceivedIds(response);
// 				sendingInterval.fast();
// 			})()
// 		}).catch( err => {
// 			if(err.message == 'Invalid data'){
// 				page++;
// 				sendingInterval.slow();
// 				logger.error('Invalid data');
// 			}else if(err.message == 'Too frequently'){
// 				sendingInterval.slow();
// 				logger.error('Too frequently');
// 			}else if(err.message == 'Server fatal error'){
// 				logger.error('Server fatal error');
// 				return;
// 			}
// 		})

// }


// var restartTimeout = function() {
//     intervalID = setTimeout(sendLoop, 0 );
// };

// the function to run each interval
// var intervalFunction = function() {
//     if(conditionIsTrue) {
//       // Break this iteration and proceed with the next
//       // without waiting for 3 seconds.

//       clearInterval(intervalID);
//       restartInterval();
//    }
// };

// получаем следующие 100 идентификаторов из players
// проверяем, есть ли они в бд идентификаторов, получивших сообщение
// идентификаторы, находящиеся в бд получивших исключаем из списка для отправки
// получаем из бд дополнительные N id для отправки (n - количествово удаленных)
// повторяем проверку
// отправили сообщение
// получили идентификаторы, которым успешно отправили сообщение
// записываем их в бд идентификаторов получивших сообщение
// повторяем цикл
// 
// получаем команду на новую рассылку - коллекция получивших сообщение очищается
// возобновляем работу после падения - коллекция получивших сообщение не очищается

// функция цикличной отправки
// вызывает сама себя
// отправляет запросы не чаще чем N раз в секунду
// отправляет N записей за раз

app.get('/send', (req, res) => {
	let message = JSON.stringify(req.query.template);
	state.save({ status: states.SENDING, msg: message});

	if(state.status == states.ERROR || states.status == states.SENDING){
		notice.state = sending;
	}
	else
		notice.state = clearRecieved;
	
	notice.send();
	// if(state.status !== states.ERROR)
	// 	sendNotification(message, true);
	// else
	// 	sendNotification(message, false);
});
app.post('/send', (req, res) => {
	let message = JSON.stringify(req.query.template);
	sendNotification(message, true);
	if(state.status !== states.ERROR)
		sendNotification(message, true);
	else
		sendNotification(message, false);
});

app.listen(port, () => {
  logger.info('Vk notifications service listening on port 3000!');
});