const MongoClient = require('mongodb').MongoClient;
const config = require('./../config').mongo.development;
const mongoClient = new MongoClient(config.host, { useNewUrlParser: true });

const {url, dbname} = config;

const dbcoll = 'state';
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
		return await db.collection(dbcoll).updateOne({}, {$set: _state}, {upsert: true});
	},
	async load(){
		let _state = await db.collection(dbcoll).findOne();
		this.status = _state.status;
		this.msg = _state.msg;
		return _state;
	},
	async clear(){
		return await await db.collection(dbcoll).drop()
	}
}

module.exports = state;