const MongoClient = require('mongodb').MongoClient;
const uri = require('./../config').mongo[process.env.NODE_ENV].uri;
const cacheSize = require('./../config').service.cacheSize;

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
				db.createCollection('received', { capped: true, size: 5242880, max: cacheSize });
				
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
		await db.collection('received').drop();
		await db.createCollection('received', { capped: true, size: 5242880, max: cacheSize });
	},

	async getPlayersIdsCount () {
		return await db.collection('players').count();
	},

	async getPlayersIdsFrom (limit = 0) {
		let n = 0;
		ids.splice(0);
		while(await cursor.hasNext() && n < limit) {
		  n++;
		  ids.push(await cursor.next());
		}
		
		return ids;
	},

 	async subtractReceivedFromPlayers (playersIds = []) {
 		let _cursor = await db.collection('received').find({}, { projection });

		while(await _cursor.hasNext()) {
			let id = await _cursor.next();
			for(let i = 0; i < playersIds.length; i++){
				if(id.id === playersIds[i].id){
					playersIds.splice(i, 1);
				}
			}
		}

		return playersIds;
 	},

 	// Сохранение в закрытую коллекцию фиксированного размера (кэш)
 	async saveReceivedIds (ids = []) {
 		return await db.collection('received').insertMany(ids);
 	},

 	async disconnect () {
 		await cursor.close();
 		return await client.close();
 	},
}

module.exports = repository;