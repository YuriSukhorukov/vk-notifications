let express = require('express');
let config = require('./config').app;
let logger = require('./modules/winston');
let VK = require('./mock/vk-api');
let state = require('./modules/state');
let repository = require('./modules/mongo');
let TimeInterval = require('./modules/time-interval');
let app = express();

const MongoClient = require('mongodb').MongoClient;
const {host, dbname} = require('./config').mongo.development;
const {SENDING, IDLE} = require('./config').states;
const mongoClient = new MongoClient(host, { useNewUrlParser: true });

let db = {};
let page = 0;
let nPerPage = 100;

let sendingInterval = new TimeInterval(350, 1000);

state.connect().then(()=>{
	// state.clear();
	state.load().then(res=>{
		console.log(res)
		if(state.status == SENDING)
			sendNotification(state.msg);
	})
})

async function sendNotification(message){
	page = 0;
	logger.info(`Notification started with message: ${message}`);
	// mongoClient.connect((err, client)=>{
	// 	db = client.db(dbname);
	// 	db.collection('received').drop();
	// 	db.collection('state').insertOne({status: SENDING, message: message});
	// 	sendLoop(message);
		
	// 	// insertMock();
	// });
	
	await repository.connect();
	await repository.clearReceivedIds(); // очищается даже когда возобновляется работа упавшего
	state.save({status: SENDING, msg: message});
	await sendLoop(message);
}

async function sendLoop(message){
	console.log('...data', message);
	// db.collection('received').drop();
	// db.collection('players').drop();
	// let newPlayers = await insertMock();
	// console.log(newPlayers)

	let count = await repository.getPlayersIdsCount();
	let delta = count - page * nPerPage;
	
	if(delta <= 0){
		logger.info(`Notification sending complete`);
		page = 0;
		await state.save({status: IDLE, msg: ''});
		await repository.disconnect();
		return;
	}

	let limit = 0;
	if(delta > nPerPage)
		limit = nPerPage;
	else
		limit = delta;

	let playersIds = await repository.getPlayersIdsFrom(page, nPerPage, limit);

	console.log('delta', delta, page)
	
	await repository.subtractReceivedFromPlayers(playersIds);

	VK.sendNotification(playersIds, message)
	.then(response => {
		(async()=>{
			page++;
			logger.info(`Successful notification for: ${JSON.stringify(response)}`);
			await repository.saveReceivedIds(response);
			sendingInterval.fast();
			console.log('SENDED')
		})()
	}).catch(err=>{
		if(err.message == 'Invalid data'){
			page++;
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

app.get('/send', (req, res) => {
	let message = JSON.stringify(req.query.template);
	sendNotification(message);
});
app.post('/send', (req, res) => {
	let message = JSON.stringify(req.query.template);
	sendNotification(message);
});

app.listen(config.port, () => {
  logger.info('Vk notifications service listening on port 3000!');
});