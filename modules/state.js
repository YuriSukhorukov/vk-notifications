const MongoClient = require('mongodb').MongoClient;
const { host, dbname } = require('./../config').mongo.development;
const mongoClient = new MongoClient(host, { useNewUrlParser: true });

let db;

const state = {
	status: '',
	msg: '',

	async connect () {
		client = await mongoClient.connect();
		db = client.db(dbname);
		return db;
	},

	async save (state) {
		this.status = state.status;
		this.msg = state.msg;
		return await db.collection('state').updateOne({}, { $set: state }, { upsert: true });
	},

	async load () {
		let state = await db.collection('state').findOne();
		this.status = state.status;
		this.msg = state.msg;
		return state;
	},

	async clear () {
		return await await db.collection('state').drop();
	},

	async disconnect () {
 		return await mongoClient.close();
 	},
}

module.exports = state;