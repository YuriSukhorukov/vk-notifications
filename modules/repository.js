const MongoClient = require('mongodb').MongoClient;
const uri = require('./../config').mongo[process.env.NODE_ENV].uri;

// Для игроков и получивших сообщение используется одна БД, 
// т.к. в ТЗ сказано что можно использовать дополнительные коллекции,
// но про дополнительные БД ничего не сказано.
// Была идея добавить новое поле last_notification в документах players,
// но было решено использовать новую коллекцию получивших уведосление,
// в целях сохранения первоначального вида исходных данных.
// 
// id игроков, которым было выслано уведомление, сохраняются 
// в коллекции received, при необходимости можно проверить получивших уведомление

let db;
let client;

const repository = {
	async connect () {
		return new Promise((res, rej) => {
			MongoClient.connect(uri, { useNewUrlParser: true }, (err, cl)=>{
				client = cl;
				db = cl.db();
				res();
			})
		})
	},

	async clearReceivedIds () {
		return await db.collection('received').deleteMany();	
	},

	async getPlayersIdsCount () {
		return await db.collection('players').count();
	},

	async getReceivedIdsCount () {
		return await db.collection('players').countDocuments();
	},

	async getPlayersIdsFrom (offset = 0, limit = 0) {
		let projection = { _id: 0 };
		return await db.collection('players').find({}, { projection }).skip(offset).limit(limit).toArray(); 
	},

 	async subtractReceivedFromPlayers (playersIds = []) {
 		let normalized = playersIds.map(element => { return element.id });
 		let query = { id: { $in: normalized } };
 		let projection = { id: '' };

 		// Поиск совпадений players ids с id получивших уведомление
 		let findedPlayersInReceived = await db.collection('received').find(query, projection).toArray();

 		// Удаление из загруженной части players ids тех id, которые получили уведомление
 		for(let i = 0; i < findedPlayersInReceived.length; i++){
			for(let j = 0; j < playersIds.length; j++){
				if(findedPlayersInReceived[i].id == playersIds[j].id){
					playersIds.splice(j, 1);
				}
			}
		}

		return playersIds;
 	},

 	async saveReceivedIds (ids = []) {
 		return await db.collection('received').insertMany(ids);
 	},

 	async disconnect () {
 		return await client.close();
 	},
}

module.exports = repository;