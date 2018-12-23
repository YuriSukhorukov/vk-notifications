const MongoClient = require('mongodb').MongoClient;
const { host, dbname } = require('./../config').mongo.development;
const mongoClient = new MongoClient(host, { useNewUrlParser: true });

let db;

// От хранения номера страницы (page * nPerPage - обрабатываемый кусок ids в коллекции)
// отказался по той причине, что коллекция может измениться и мы можем 
// пропустить некоторых пользователей при возобновленной рассылке

const state = {
	status: '',
	msg: '',
	page: 0,
	offset: 0,

	async connect () {
		client = await mongoClient.connect();
		db = client.db(dbname);
		return db;
	},

	async save (state = {}) {
		this.status = state.status;
		this.msg = state.msg;
		this.page = state.page;
		this.offset = state.offset;
		return await db.collection('state').updateOne({}, { $set: state }, { upsert: true });
	},

	async load () {
		let state = await db.collection('state').findOne();
		this.status = state.status;
		this.msg = state.msg;
		this.page = state.page;
		this.offset = state.offset;
		return state;
	},

	async clear () {
		return await await db.collection('state').remove();
	},

	async disconnect () {
 		return await mongoClient.close();
 	},
}

module.exports = state;