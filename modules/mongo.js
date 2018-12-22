const MongoClient = require('mongodb').MongoClient;
const config = require('./../config').mongo.development;
const mongoClient = new MongoClient(config.host, { useNewUrlParser: true });

const {url, dbname} = config;

const dbcollection = 'players';
const data = {id: 1, first_name: 'Ivan'};
const query = {name: 'Ivan'};

mongoClient.connect(function(err, client){
  if(err) return console.log(err);
   client.db(dbname).collection(dbcollection).updateMany(query, {$set: data}, {upsert: true}, (res) => {
   	console.log(res);
		client.close();
	});
});

module.exports = MongoClient;