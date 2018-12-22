let express = require('express');
let config = require('./config').app;
let logger = require('./modules/winston');
let mongo = require('./modules/mongo')
let VK = require('./mock/vk-api');
let app = express();

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

let requestsPerSecond = 0;
let maxRequestPerSecond = 3;

function resetRequestNumber () {
	requestsPerSecond = 0;
	setTimeout(resetRequestNumber, 1000);
}

resetRequestNumber();

async function removeMatchesWhereWhat(findedPlayersInReceived, playersIds){
	for(let i = 0; i < findedPlayersInReceived.length; i++){
		for(let j = 0; j < playersIds.length; j++){
			if(findedPlayersInReceived[i].id == playersIds[j].id){
				playersIds.splice(j, 1);
			}
		}
	}
}

async function saveReceivedIds(ids){
	return await mongo.insert(response, 'received');
}

async function getPlayersIds(){
	return await mongo.getIdsFrom(page, nPerPage, 'players');
}

async function getReceivedIds(){
	return await mongo.getIdsFrom(page, nPerPage, 'players');
}

let page = 0;
let nPerPage = 100;

(async()=>{
	// получение данных из бд
	// mongo.clear('players');
	// mongo.clear('received');
	// let count = await mongo.getCountFrom('received');
	
	// let receivedIds = await mongo.getIdsFrom(0, 10, 'received');
	// let insertedPlayers = await mongo.insertMockTo(1000000, 'players');
	// let insertedReceived = await mongo.insertMockTo(10, 'received');

	// console.log(count);
	// console.log(insertedPlayers);
	// console.log(receivedIds);
	// console.log(inserted);
	
	let playersIds = await mongo.getIdsFrom(page, nPerPage, 'players');
	let findedPlayersInReceived = await mongo.find(playersIds, 'received');
	console.log('playersIds: ', playersIds);
	console.log('findedPlayersInReceived', findedPlayersInReceived);
	// исключение из списка рассылки тех, тко присутствует в бд получивших
	removeMatchesWhereWhat(findedPlayersInReceived, playersIds);
	console.log('after clear playersIds: ', playersIds);
	

	// отправка сообщений
	VK.sendNotification(playersIds, 'message')
		.then(response => {
			(async()=>{
				console.log('Send successful');
				console.log(response);
				// Сохранение ids которым удалось отправить оповещение
				let insertedReceived = await mongo.insert(response, 'received');
				console.log('Save received');
				console.log(insertedReceived);
				logger.info(`Successful notification for: ${JSON.stringify(response)}`);
			})()
		}).catch(err=>{
			console.log(err);
			logger.error(err);
		})
})()


app.get('/send', (req, res) => {
	let message = req.query.template;

	mongo.getIds('players').then(ids=>{
		VK.sendNotification(ids, message)
			.then(response=>{
				logger.info(`successful notification for: ${JSON.stringify(response)}`);
				mongo.insertReceived(ids);
			})
			.catch(error=>{
				logger.error(error);
			});
	})
});
app.post('/send', (req, res) => {
	let message = req.query.template;
});

app.listen(config.port, () => {
  logger.info('Vk notifications service listening on port 3000!');
});