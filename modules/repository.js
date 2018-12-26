const MongoClient = require('mongodb').MongoClient;
const uri = require('./../config').mongo[process.env.NODE_ENV].uri;
const cacheSize = require('./../config').service.cacheSize;

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
let cursor;
let query = {};
let projection = { _id: 0, id: 1 };
let ids = [];

const repository = {
	async connect () {
		return new Promise((res, rej) => {
			MongoClient.connect(uri, { useNewUrlParser: true }, (err, cl)=>{
				client = cl;
				db = cl.db();
				cursor = db.collection('players').find({}, { projection });
				db.collection('received').drop();
				db.createCollection('received', { capped : true, size : 5242880, max : cacheSize });
				res();
			})
		})
	},

	async skipPlayersIdsQuantity (offset) {
		return await cursor.skip(offset);
	},

	async resetPlayersIdsCursor () {
		cursor = await db.collection('players').find({}, { projection });
	},

	async clearReceivedIds () {
		// if(await db.collection('received').isCapped()){
			await db.collection('received').drop();
			await db.createCollection('received', { capped : true, size : 5242880, max : cacheSize });
		// }
		// return await db.collection('received').deleteMany();	
	},

	async getPlayersIdsCount () {
		return await db.collection('players').count();
	},

	async getReceivedIdsCount () {
		// return await db.collection('received').count();
	},

	async getPlayersIdsFrom (limit = 0) {
		// let projection = { _id: 0, id: '' };
		// Изменить метод итерации по игрокам на способ с помощью курсора
		// return await db.collection('players').find({}, { projection }).skip(offset).limit(limit).toArray(); 
		// 
		// await db.collection('players').createIndex({ id: 1 });
		let n = 0;
		ids.splice(0);
		while(await cursor.hasNext() && n < limit) {
		  n++;
		  ids.push(await cursor.next());
		}

		// db.collection('received').deleteMany();
		
		return ids;
	},

 	async subtractReceivedFromPlayers (playersIds = []) {
 		// let normalized = playersIds.map(element => { return element.id });
 		// let query = { id: { $in: normalized }  };
 		// let projection = { _id: 0, id: '' };
		// console.log('...da!!!!!!!!!!!!!	qta')
 		// Поиск совпадений players ids с id получивших уведомление
 		// let findedPlayersInReceived = await db.collection('received').find(query, projection).toArray();

 		let cr = await db.collection('received').find({}, { projection });
 		let n = 0;
 		let findedPlayersInReceived = [];

 		let count = await db.collection('received').count();
 		// console.log(await db.collection('received').isCapped());
 		console.log(count);

		while(await cr.hasNext()) {
		  // findedPlayersInReceived.push(await cr.next());

			let id = await cr.next();
			// console.log(id);
			for(let j = 0; j < playersIds.length; j++){
				if(id.id === playersIds[j].id){
					playersIds.splice(j, 1);
					// console.log('< deleted')
				}
			}
		}

		return playersIds;
 	},

 	async saveReceivedIds (ids = []) {
 		try {
 			return await db.collection('received').insertMany(ids);	
 		} catch(e) {
 			console.log(e);
 		}
 	},

 	async disconnect () {
 		await cursor.close();
 		return await client.close();
 	},
}

module.exports = repository;