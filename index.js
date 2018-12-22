let express = require('express');
let config = require('./config').app;
let logger = require('./modules/winston');
let mongo = require('./modules/mongo')
let VK = require('./mock/vk-api');
let app = express();


let page = 0;
let nPerPage = 50;
let nPerPageDelta = 0;
function updatePage(delta){
	if(nPerPageDelta + delta > nPerPage){
		nPerPageDelta = nPerPage - nPerPageDelta
	}
}

(async()=>{
	// получение данных из бд
	// mongo.clear('players');
	// mongo.clear('received');
	// let count = await mongo.getCountFrom('received');
	let playersIds = await mongo.getIdsFrom(page, nPerPage, 'players');
	// let receivedIds = await mongo.getIdsFrom(0, 10, 'received');
	// let insertedPlayers = await mongo.insertMockTo(1000000, 'players');
	// let insertedReceived = await mongo.insertMockTo(10, 'received');
	let findedPlayersInReceived = await mongo.find(playersIds, 'received');
	// console.log(count);
	console.log(playersIds);
	// console.log(insertedPlayers);
	// console.log(receivedIds);
	// console.log(inserted);
	console.log(findedPlayersInReceived);


	// исключение из списка рассылки тех, тко присутствует в бд получивших
	let idsNotification = [];
	let deletedCount = 0;
	for(let i = 0; i < findedPlayersInReceived.length; i++){
		for(let j = 0; j < playersIds.length; j++){
			if(findedPlayersInReceived[i].id == playersIds[j].id){
				playersIds.splice(j, 1);
				deletedCount++;
			}
		}
	}
	console.log(playersIds);
	console.log(deletedCount);



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

// let page = 0;
// let nPerPage = 5;
// let interval = 3000;
// function getIds(){
// 	mongo.getIds(page, nPerPage).then(res=>{
// 		console.log(res);
// 		page++;
// 		setTimeout(getIds, interval);
// 	}).catch(err=>{console.log(err)});
// }
// getIds();

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