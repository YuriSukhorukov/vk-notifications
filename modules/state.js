const MongoClient = require('mongodb').MongoClient;
const {host, dbname} = require('./../config').mongo.development;
const mongoClient = new MongoClient(host, { useNewUrlParser: true });

let db;

const state = {
	status: '',
	msg: '',

	async connect(){
		client = await mongoClient.connect();
		db = client.db(dbname);
		return db;
	},

	async save(_state){
		this.status = _state.status;
		this.msg = _state.msg;
		return await db.collection('state').updateOne({}, {$set: _state}, {upsert: true});
	},

	async load(){
		let _state = await db.collection('state').findOne();
		this.status = _state.status;
		this.msg = _state.msg;
		return _state;
	},

	async clear(){
		return await await db.collection('state').drop()
	},
	
	async disconnect(){
 		return await mongoClient.close();
 	},
}

module.exports = state;