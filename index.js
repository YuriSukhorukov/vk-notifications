let express = require('express');
let config = require('./config').app;
let logger = require('./modules/winston');
let VK = require('./mock/vk-api');
let state = require('./modules/state');
let repository = require('./modules/mongo')
let app = express();

const MongoClient = require('mongodb').MongoClient;
const {host, dbname} = require('./config').mongo.development;
const {SENDING, IDLE} = require('./config').states;
const mongoClient = new MongoClient(host, { useNewUrlParser: true });

let db = {};
let page = 0;
let nPerPage = 100;


(async()=>{
	// let a = await repository.connect();
	// a = await repository.clearReceivedIds();
	// a = await repository.getPlayersIdsCount();
	// a = await repository.getPlayersIdsFrom(page, nPerPage);
	// a = await repository.getSubtractionReceivedFromPlayers(playersIds);

	// console.log(a);
})()



state.connect().then(()=>{
	// state.save({status: IDLE, msg: 'ф!--0.112111!!!111haaisss'})
	// state.clear();
	state.load().then(res=>{
		console.log(res)
		if(state.status == SENDING)
			sendNotification('hi');
	})
})




// repository.connect().then(res=>{
// 	console.log(res);
// });


// 



async function sendNotification(message){
	page = 0;
	logger.info(`Notification started with message: ${JSON.stringify(message)}`);
	// mongoClient.connect((err, client)=>{
	// 	db = client.db(dbname);
	// 	db.collection('received').drop();
	// 	db.collection('state').insertOne({status: SENDING, message: message});
	// 	sendLoop(message);
		
	// 	// insertMock();
	// });
	
	
	await repository.connect();
	await repository.clearReceivedIds();
	state.save({status: SENDING, msg: message});
	await sendLoop('message');

	// console.log(a);
}

async function sendLoop(message){
	// db.collection('received').drop();
	// db.collection('players').drop();
	// let newPlayers = await insertMock();
	// console.log(newPlayers)

	// let count = await db.collection('players').countDocuments();
	let count = await repository.getPlayersIdsCount();

	let delta = count - page * nPerPage;
	
	if(delta <= 0){
		logger.info(`Notification sending complete`);
		page = 0;
		state.save({status: IDLE, msg: ''});
		return;
	}

	let playersIds;
	let limit = 0;
	if(delta > nPerPage)
		limit = nPerPage;
	else
		limit = delta;

	playersIds = await repository.getPlayersIdsFrom(page, nPerPage, limit);

	console.log('delta', delta, page);
	
	await repository.subtractReceivedFromPlayers(playersIds);

	VK.sendNotification(playersIds, 'message')
	.then(response => {
		(async()=>{
			page++;
			logger.info(`Successful notification for: ${JSON.stringify(response)}`);
			// let insertedReceived = await db.collection('received').insertMany(response);
			await repository.saveReceivedIds(response);
			console.log('SENDED')
		})()
	}).catch(err=>{
		// requestsPerSecond++;
		if(err.message == 'Invalid data'){
			page++;
			logger.error('Invalid data');
		}else if(err.message == 'Too frequently'){
			logger.error('Too frequently');
		}else if(err.message == 'Server fatal error'){
			logger.error('Server fatal error');
			return;
		}
	})
	setTimeout(sendLoop, 350);
}

// async function removeMatchesWhatWhere(findedPlayersInReceived, playersIds){
// 	for(let i = 0; i < findedPlayersInReceived.length; i++){
// 		for(let j = 0; j < playersIds.length; j++){
// 			if(findedPlayersInReceived[i].id == playersIds[j].id){
// 				playersIds.splice(j, 1);
// 			}
// 		}
// 	}
// }


// получаем следующие 100 идентификаторов из players
// проверяем, есть ли они в бд идентификаторов, получивших сообщение
// идентификаторы, находящиеся в бд получивших исключаем из списка для отправки
// получаем из бд дополнительные N id для отправки (n - количествово удаленных)
// повторяем проверку
// отправили сообщение
// получили идентификаторы, которым успешно отправили сообщение
// записываем их в бд идентификаторов получивших сообщение
// повторяем цикл

// фуекция цикличной отправки
// вызывает сама себя
// отправляет запросы не чаще чем N раз в секунду
// отправляет N записей за раз


app.get('/send', (req, res) => {
	let message = req.query.template;
	sendNotification(JSON.stringify(message));
});
app.post('/send', (req, res) => {
	let message = req.query.template;
});

app.listen(config.port, () => {
  logger.info('Vk notifications service listening on port 3000!');
});