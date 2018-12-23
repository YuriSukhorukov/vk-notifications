const MongoClient = require('mongodb').MongoClient;
const config = require('./../config').mongo.development;
const mongoClient = new MongoClient(config.host, { useNewUrlParser: true });

const {url, dbname} = config;

const dbcoll = 'state';
let db = {};

const state = {
	async connect(){
		client = await mongoClient.connect();
		db = client.db(dbname);
		return db;
	},
	async save(_state){
		return await db.collection(dbcoll).updateOne(_state, {$set: _state}, {upsert: true});
	},
	async load(){
		return await db.collection(dbcoll).findOne()
	},
}

module.exports = state;