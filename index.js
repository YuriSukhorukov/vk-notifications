let express = require('express');
let config = require('./config').app;
let logger = require('./modules/winston');
// let mongo = require('./modules/mongo')
let VK = require('./mock/vk-api');
let app = express();

// const {url, dbname} = require('./config').mongo.development;
// const MongoClient = require('mongodb').MongoClient;
// const mongoClient = new MongoClient(config.host, { useNewUrlParser: true });



// var MongoClient = require('mongodb').MongoClient, assert = require('assert');
// // Location
// var url = 'mongodb://localhost:27017/kosmosGamesDB';

// // Connect
// let db = {};
// MongoClient.connect(url, { useNewUrlParser: true }, function(err, _db) {
//   assert.equal(null, err);
//   db = _db;
//   console.log("Connected correctly to server");
//   // db.close();
// });
// 
let page = 0;
let nPerPage = 100;

const MongoClient = require('mongodb').MongoClient;
const {host, dbname} = require('./config').mongo.development;
const mongoClient = new MongoClient(host, { useNewUrlParser: true });

let db = {};

// mongoClient.connect((err, client)=>{
// 	db = client.db(dbname);
// 	console.log('connect');
// 	(async()=>{
// 		let a = await db.collection('players').countDocuments();
// 		let b = await db.collection('players').find().skip(page * nPerPage).limit(nPerPage).toArray(); 

		// let _qr = b.map(element => {return element.id});
		// let query = { id: { $in: _qr } };
		// let projection = { id: '' };
		// let c = await db.collection('received').find(query, projection).toArray();

// 		// let e = db.collection('received').insertMany(c);

// 		// let f = await db.collection('received').drop();
// 		console.log(a);
// 		console.log(b);
// 		console.log(c);
// 		// console.log(f);
// 	})()
// });


// mongoClient.connect((err, client)=>{

// });

async function insertMock(){
	let datas = [];
	for(let i = 0; i < 1110; i++){
		let _data = {id: i, first_name: 'Ivan'};
		datas.push(_data);
	}

	return await db.collection('players').insertMany(datas);
}



function sendNotification(message){
	page = 0;
	logger.info(`Notification started with message: ${JSON.stringify(message)}`);
	mongoClient.connect((err, client)=>{
		db = client.db(dbname);
		db.collection('received').drop();
		sendLoop();
		
		// insertMock();
	});
}

async function sendLoop(){
	// db.collection('received').drop();
	// db.collection('players').drop();
	// let newPlayers = await insertMock();
	// console.log(newPlayers)

	let count = await db.collection('players').countDocuments();

	let delta = count - page * nPerPage;
	
	if(delta <= 0){
		let count1 = await db.collection('received').countDocuments();
		let total = count / 100;
		let progress = total * count1;
		logger.info(`Notification sending stopped`);
		return;
	}

	let playersIds;
	if(delta > nPerPage)
		playersIds = await db.collection('players').find().skip(page * nPerPage).limit(nPerPage).toArray();
	else
		playersIds = await db.collection('players').find().skip(page * nPerPage).limit(delta).toArray();

	console.log('delta', delta, page);

	// let playersIds = await db.collection('players').find().skip(page * nPerPage).limit(nPerPage).toArray();

	let _qr = playersIds.map(element => {return element.id});
	let query = { id: { $in: _qr } };
	let projection = { id: '' };
	let findedPlayersInReceived = await db.collection('received').find(query, projection).toArray();

	// console.log(findedPlayersInReceived);
	// console.log(playersIds);

	removeMatchesWhatWhere(findedPlayersInReceived, playersIds);
	// console.log(playersIds);

	VK.sendNotification(playersIds, 'message')
	.then(response => {
		(async()=>{
			page++;
			logger.info(`Successful notification for: ${JSON.stringify(response)}`);
			let insertedReceived = await db.collection('received').insertMany(response);
			console.log('SENDED')
			// setTimeout(sendLoop, 5000);
			// console.log(insertedReceived)
		})()
	}).catch(err=>{
		// requestsPerSecond++;
		if(err.message == 'Invalid data'){
			page++;
			// console.log('Invalid data')
			logger.error('Invalid data');
		}else if(err.message == 'Too frequently'){
			// console.log('Too frequently')
			logger.error('Too frequently');
		}else if(err.message == 'Server fatal error'){
			logger.error('Server fatal error');
			return;
			// save state
			// process.exit(0);
		}
	})
	setTimeout(sendLoop, 100);
}


sendNotification('hi!');


async function removeMatchesWhatWhere(findedPlayersInReceived, playersIds){
	for(let i = 0; i < findedPlayersInReceived.length; i++){
		for(let j = 0; j < playersIds.length; j++){
			if(findedPlayersInReceived[i].id == playersIds[j].id){
				playersIds.splice(j, 1);
			}
		}
	}
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

// фуекция цикличной отправки
// вызывает сама себя
// отправляет запросы не чаще чем N раз в секунду
// отправляет N записей за раз

// let requestsPerSecond = 0;
// let maxRequestPerSecond = 3;

// function resetRequestNumber () {
// 	requestsPerSecond = 0;
// 	setTimeout(resetRequestNumber, 1000);
// }

// // (async()=>{
// // 	let a = await mongo.clear('received');
// // 	console.log(a);
// // })()

// resetRequestNumber();

// async function removeMatchesWhatWhere(findedPlayersInReceived, playersIds){
// 	for(let i = 0; i < findedPlayersInReceived.length; i++){
// 		for(let j = 0; j < playersIds.length; j++){
// 			if(findedPlayersInReceived[i].id == playersIds[j].id){
// 				playersIds.splice(j, 1);
// 			}
// 		}
// 	}
// }

// async function saveReceivedIds(ids){
// 	return await mongo.insert(ids, 'received');
// }

// async function getPlayersIds(){
// 	return await mongo.getIdsFrom(page, nPerPage, 'players');
// }

// async function getReceivedIds(ids){
// 	return await mongo.find(ids, 'received');
// }

// // let page = 0;
// // let nPerPage = 5;

// async function sendNotification(){
// 	// получение данных из бд
// 	// mongo.clear('players');
// 	mongo.clear('received');
// 	// let count = await mongo.getCountFrom('received');
	
// 	// let receivedIds = await mongo.getIdsFrom(0, 10, 'received');
// 	// let insertedPlayers = await mongo.insertMockTo(1000000, 'players');
// 	// let insertedReceived = await mongo.insertMockTo(10, 'received');

// 	// console.log(count);
// 	// console.log(insertedPlayers);
// 	// console.log(receivedIds);
// 	// console.log(inserted);
	
// 	let playersIds = await getPlayersIds();
// 	let findedPlayersInReceived = await getReceivedIds(playersIds);

// 	// console.log('playersIds: ', playersIds);
// 	// console.log('findedPlayersInReceived', findedPlayersInReceived);
// 	// исключение из списка рассылки тех, тко присутствует в бд получивших
// 	// removeMatchesWhatWhere(findedPlayersInReceived, playersIds);
// 	// console.log('after clear playersIds: ', playersIds);
	

// 	// отправка сообщений
// 	VK.sendNotification(playersIds, 'message')
// 		.then(response => {
// 			requestsPerSecond++;
// 			(async()=>{
// 				// console.log('Send successful');
// 				// console.log(response);
// 				// Сохранение ids которым удалось отправить оповещение
// 				let insertedReceived = await saveReceivedIds(response);
// 				// console.log('Save received');
// 				// console.log(insertedReceived);
// 				// logger.info(`Successful notification for: ${JSON.stringify(response)}`);
// 				setTimeout(sendNotification, 1000);
// 			})()
// 		}).catch(err=>{
// 			requestsPerSecond++;
// 			if(err.message == 'Invalid data'){
// 				page++;
// 				setTimeout(sendNotification, 1000);
// 			}else if(err.message == 'Too frequently'){
// 				setTimeout(sendNotification, 1000);
// 			}else if(err.message == 'Server fatal error'){
// 				// save state
// 				process.exit(0);
// 			}

// 			console.log(err);
// 			logger.error(err);
// 		})
// }

// setTimeout(sendNotification, 200)


app.get('/send', (req, res) => {
	let message = req.query.template;
	sendNotification(JSON.stringify(message));
	// mongo.getIds('players').then(ids=>{
	// 	VK.sendNotification(ids, message)
	// 		.then(response=>{
	// 			logger.info(`successful notification for: ${JSON.stringify(response)}`);
	// 			mongo.insertReceived(ids);
	// 		})
	// 		.catch(error=>{
	// 			logger.error(error);
	// 		});
	// })
});
app.post('/send', (req, res) => {
	let message = req.query.template;
});

app.listen(config.port, () => {
  logger.info('Vk notifications service listening on port 3000!');
});