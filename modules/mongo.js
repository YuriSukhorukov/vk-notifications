const MongoClient = require('mongodb').MongoClient;
const config = require('./../config').mongo.development;
const mongoClient = new MongoClient(config.host, { useNewUrlParser: true });

const {url, dbname} = config;

const dbcollection = 'players';
const dbcollection2 = 'received';

const data = {id: 1, first_name: 'Ivan'};
const datas = [];
const query = {name: 'Ivan'};

const mongo = {
	clear(_collection){
		return new Promise((res, rej)=>{
			mongoClient.connect((err, client)=>{
				let db = client.db(dbname);
				let collection = db.collection(_collection);
				collection.drop().then(result=>{
					res(result);
				}); 
			})
		})
	},
	async getCountFrom(_collection) {
		let client = await mongoClient.connect();
		let db = client.db(dbname);
		let collection = db.collection(_collection);
		try {
			return await collection.countDocuments()
		} finally {
			// client.close();
		}
	},
	async getIdsFrom(page, nPerPage, _collection){
		let client = await mongoClient.connect();
		let db = client.db(dbname);
		let collection = db.collection(_collection);
		try {
			// TODO брать только id
			return await collection.find().skip(page * nPerPage).limit(nPerPage).toArray(); 
		} finally {
			// client.close();
		}
	},
	async find(query, _collection){
		let _qr = query.map(element => {return element.id});

		let client = await mongoClient.connect();
		let db = client.db(dbname);
		let collection = db.collection(_collection);
		try {
			let query = { id: { $in: _qr } };
			let projection = { id: '' };
			return await collection.find(query, projection).toArray();
		} finally {
			client.close();
		}
	},
	async insert (ids, _collection) {
		let client = await mongoClient.connect();
		let db = client.db(dbname);
		let collection = db.collection(_collection);
		try {
			// TODO сохранять только id
			return await collection.insertMany(ids);
		} finally {
			client.close();
		}
	},

	async insertMockTo(count, _collection){
		for(let i = 0; i < count; i++){
			let _data = {id: i, first_name: 'Ivan'};
			datas.push(_data);
		}

		let client = await mongoClient.connect();
		let db = client.db(dbname);
		let collection = db.collection(_collection);
		try {
			return await collection.insertMany(datas);
		} finally {
			client.close();
		}
	}
}

module.exports = mongo;