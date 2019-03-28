const chalk = require('chalk');
const MongoClient = require('mongodb').MongoClient;
const MongoConfig = require ('./credentials/mongo.config.json');

//Mongo DB

const MongoAPI = function MongoAPI() {

	const useRemoteMongoDB = false; //false
	const mongoURI = (useRemoteMongoDB == false) ? MongoConfig.localServerURI : MongoConfig.remoteServerURI;
	const dbName =  MongoConfig.database;

	const mongoConnect = function mongoConnect() {
		return new Promise(
			async (resolve) => {
				const client = new MongoClient(mongoURI, { useNewUrlParser: true });
				await client.connect();
				resolve(client);
			});
	};

	this.insertMany = function insertMany(collection,data) {
		return new Promise(
			async (resolve) => {

				const client = await mongoConnect();
					
				const mongoCollection = client.db(dbName).collection(collection);
				const result = await mongoCollection.insertMany(data);

				console.log(chalk.blue(`${result.ops.length} items inserted`));
				client.close();

				// console.log(result.insertedCount);
				// console.log(result);
				
				resolve(result.insertedIds);
					
			});

	};

	this.insertOne = function insertOne(collection,item) {
		
		return new Promise(
			async (resolve) => {

				const client = await mongoConnect();
					
				const mongoCollection = client.db(dbName).collection(collection);
				const result = await mongoCollection.insertOne(item);

				// console.log(chalk.blue('1 item inserted'));
				client.close();

				// console.log(result.insertedCount);
				// console.log(result.insertedId);
				// console.log(result);
				
				resolve(result);
					
			});
	};


	this.find = function find(collection,query) {
		return new Promise(
			async (resolve) => {

				const client = await mongoConnect();
					
				const mongoCollection = client.db(dbName).collection(collection);
				const result = await mongoCollection.find(query).toArray();

				client.close();
				resolve(result);
					
			});

	};

};

module.exports = new MongoAPI;