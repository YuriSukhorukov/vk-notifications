const MongoClient = require('mongodb').MongoClient;
const config = require('./../config').mongo.development;
const mongoClient = new MongoClient(config.host, { useNewUrlParser: true });

const {url, dbname} = config;

// TODO для игроков и получивших сообщение используется одна БД, 
// т.к. в ТЗ сказано что можно использовать дополнительные коллекции,
// но про дополнительные БД ничего не сказано.
// Было решено использовать новую коллекцию в целях сохранения  
// первоначального вида исходных данных.

let db;

const repository = {
	async connect(){
		client = await mongoClient.connect();
		db = client.db(dbname);
		return db;
	},

	async clearReceivedIds(){
		return await db.collection('received').drop();
	},

	async getPlayersIdsCount(){
		return await db.collection('players').countDocuments();
	},

	async getPlayersIdsFrom(page, nPerPage){
		return await db.collection('players').find().skip(page * nPerPage).limit(nPerPage).toArray(); 
	},

 	async getSubtractionReceivedFromPlayers(playersIds){
 		let normalized = playersIds.map(element => {return element.id});
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

 	async saveReceivedIds(ids){
 		return await db.collection('received').insertMany(ids);
 	},

 	





	// async findMatchesInReceived(query) {
	// 	let _qr = query.map(element => {return element.id});

	// 	let client = await mongoClient.connect();
	// 	let db = client.db(dbname);
	// 	let collection = db.collection(_collection);
	// 		let query = { id: { $in: _qr } };
	// 		let projection = { id: '' };
	// 		return await collection.find(query, projection).toArray();
	// },


	// async clear(_collection){
	// 	return await db.collection(_collection).drop();
	// },
	// async getCountFrom(_collection) {
	// 	return await db.collection(_collection).countDocuments()
	// },
	// async getIdsFrom(page, nPerPage, _collection){
	// 	return await db.collection(_collection).find().skip(page * nPerPage).limit(nPerPage).toArray(); 
	// },
	// async find(query, _collection){
	// 	let _qr = query.map(element => {return element.id});

	// 	let client = await mongoClient.connect();
	// 	let db = client.db(dbname);
	// 	let collection = db.collection(_collection);
	// 	try {
	// 		let query = { id: { $in: _qr } };
	// 		let projection = { id: '' };
	// 		return await collection.find(query, projection).toArray();
	// 	} finally {
	// 		// client.close();
	// 	}
	// },
	// async insert (ids, _collection) {
	// 	let client = await mongoClient.connect();
	// 	let db = client.db(dbname);
	// 	let collection = db.collection(_collection);
	// 	try {
	// 		return await collection.insertMany(ids);
	// 	} finally {
	// 		// client.close();
	// 	}
	// },

	async insertMockTo(count, _collection){
		let datas = [];
		for(let i = 0; i < count; i++){
			let _data = {id: i, first_name: 'Ivan'};
			datas.push(_data);
		}

		let client = await mongoClient.connect();
		let db = client.db(dbname);
		let collection = db.collection(_collection);
		return await collection.insertMany(datas);
	}
}

module.exports = repository;