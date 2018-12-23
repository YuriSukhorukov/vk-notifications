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

let sendingInterval = new TimeInterval(350, 1000);

state.connect().then(() => {
	state.load().then(res => {
		if(state.status == states.SENDING)
			sendNotification(state.msg);
	}).catch(err => {
		state.save({ status: states.IDLE, msg: '' });
	})
})

async function sendNotification(){
	console.log('! ', message)
	page = 0;
	logger.info(`Notification started with message: ${ message }`);
	
	await repository.connect();
	// TODO не очищать, в случае остановки сервера в результате падения
	if(state.status == states.IDLE){
		let receivedIdsCount = await repository.getReceivedIdsCount()
		if(receivedIdsCount > 0)
			await repository.clearReceivedIds(); // очищается даже когда возобновляется работа упавшего
	}
	await state.save({ status: states.SENDING, msg: message});
	await sendLoop(message);
}

async function sendLoop(){
	// TODO исправить баг с сообщением
	console.log('...data', message);
	// db.collection('received').drop();
	// db.collection('players').drop();
	// let newPlayers = await insertMock();

	let playersCount = await repository.getPlayersIdsCount();
	let delta = playersCount - page * nPerPage;
	
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

	let playersIds = await repository.getPlayersIdsFrom(page, nPerPage, limit);

	console.log('delta', delta, page);
	
	await repository.subtractReceivedFromPlayers(playersIds);

	VK.sendNotification(playersIds, message)
	.then(response => {
		(async () => {
			page++;
			logger.info(`Successful notification for: ${JSON.stringify(response)}`);
			await repository.saveReceivedIds(response);
			sendingInterval.fast();
			console.log('SENDED');
		})()
	}).catch( err => {
		if(err.message == 'Invalid data'){
			page++;
			sendingInterval.faster();
			logger.error('Invalid data');
		}else if(err.message == 'Too frequently'){
			sendingInterval.slow();
			logger.error('Too frequently');
		}else if(err.message == 'Server fatal error'){
			logger.error('Server fatal error');
			return;
		}
	})
	setTimeout(sendLoop, sendingInterval.time);
}

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

let message = '';

app.get('/send', (req, res) => {
	message = JSON.stringify(req.query.template);
	state.save({status: states.IDLE, msg: message});
	sendNotification(message);
});
app.post('/send', (req, res) => {
	message = JSON.stringify(req.query.template);
	state.save({status: states.IDLE, msg: message});
	sendNotification(message);
});

app.listen(port, () => {
  logger.info('Vk notifications service listening on port 3000!');
});