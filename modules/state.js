const MongoClient = require('mongodb').MongoClient;
const uri = require('./../config').mongo[process.env.NODE_ENV].uri;

let db;
let client;
 
// offset для выборки из БД идентификаторов сохраняется как часть состояния, 
// чтобы начать рассылку с нужного места

// TODO добавить массив requests - для хранения новых запросов в случае, 
// если мы получаем новый запрос во время выполнения рассылки

const state = {
	status: '',
	msg: '',
	offset: 0,

	async connect () {
		return new Promise((res, rej) => {
			MongoClient.connect(uri, { useNewUrlParser: true }, (err, cl)=>{
				client = cl;
				db = cl.db();
				res();
			})
		})
	},

	async save (state = {}) {
		this.status = state.status;
		this.msg = state.msg;
		this.offset = state.offset;
		return await db.collection('state').updateOne({}, { $set: state }, { upsert: true });
	},

	async load () {
		let state = await db.collection('state').findOne();
		this.status = state.status;
		this.msg = state.msg;
		this.offset = state.offset;
		return state;
	},

	async clear () {
		return await await db.collection('state').deleteMany();
	},

	async disconnect () {
 		return await client.close();
 	},
}

module.exports = state;