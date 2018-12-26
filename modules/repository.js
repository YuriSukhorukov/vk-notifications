const MongoClient = require('mongodb').MongoClient;
const uri = require('./../config').mongo[process.env.NODE_ENV].uri;
const { cacheSize, cacheMemory } = require('./../config').repository;

let db;
let client;
let cursor;
let query = {};
let projection = { _id: 0, id: 1 };

let playersIds = [];

const repository = {
	async connect () {
		return new Promise((res, rej) => {
			MongoClient.connect(uri, { useNewUrlParser: true }, (err, cl)=>{
				client = cl;
				db = cl.db();
				cursor = db.collection('players').find(query, { projection });
				
				try {
					db.collection('received').drop();
					db.createCollection('received', { capped: true, size: cacheMemory, max: cacheSize });
				} catch(e) {	
					console.log(e.message);
				}
				
				res();
			})
		})
	},

	async skipPlayersIdsQuantity (offset = 0) {
		return await cursor.skip(offset);
	},

	async resetPlayersIdsCursor () {
		cursor = await db.collection('players').find(query, { projection });
	},

	async clearReceivedIds () {
		try {
			await	db.collection('received').drop();
			await db.createCollection('received', { capped: true, size: cacheMemory, max: cacheSize });
		} catch(e) {	
			console.log(e.message);
		}
	},

	async getPlayersIdsCount () {
		return await db.collection('players').count();
	},

	async getPlayersIdsFrom (limit = 0) {
		let n = 0;
		playersIds.splice(0);
		while(await cursor.hasNext() && n < limit) {
		  n++;
		  playersIds.push(await cursor.next());
		}
		
		return playersIds;
	},

 	async subtractReceivedFromPlayers (playersIds = []) {
 		let _cursor = await db.collection('received').find(query, { projection });

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
