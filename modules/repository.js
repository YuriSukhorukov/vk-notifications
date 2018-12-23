const MongoClient = require('mongodb').MongoClient;
const {host, dbname} = require('./../config').mongo[process.env.NODE_ENV]
const mongoClient = new MongoClient(host, { useNewUrlParser: true });

// Для игроков и получивших сообщение используется одна БД, 
// т.к. в ТЗ сказано что можно использовать дополнительные коллекции,
// но про дополнительные БД ничего не сказано.
// Была идея добавить новое поле last_notification в документах players,
// но было решено использовать новую коллекцию получивших уведосление,
// в целях сохранения первоначального вида исходных данных.

let db;

const repository = {
	async connect () {
		client = await mongoClient.connect();
		db = client.db(dbname);
		return db;
	},

	async clearReceivedIds () {
		return await db.collection('received').remove();	
	},

	async getPlayersIdsCount () {
		return await db.collection('players').countDocuments();
	},

	async getReceivedIdsCount () {
		return await db.collection('players').countDocuments();
	},

	async getPlayersIdsFrom (offset = 0, limit = 0) {
		return await db.collection('players').find().skip(offset).limit(limit).toArray(); 
	},

 	async subtractReceivedFromPlayers (playersIds = []) {
 		let normalized = playersIds.map(element => { return element.id });
 		let query = { id: { $in: normalized } };
 		let projection = { id: '' };
 		let findedPlayersInReceived = await db.collection('received').find(query, projection).toArray();

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
 		return await mongoClient.close();
 	},

	// async insertMockTo(count, _collection){
	// 	let datas = [];
	// 	for(let i = 0; i < count; i++){
	// 		let _data = {id: i, first_name: 'Ivan'};
	// 		datas.push(_data);
	// 	}

	// 	let client = await mongoClient.connect();
	// 	let db = client.db(dbname);
	// 	let collection = db.collection(_collection);
	// 	return await collection.insertMany(datas);
	// }
}

module.exports = repository;