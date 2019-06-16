const chalk = require('chalk');
const MongoClient = require('mongodb').MongoClient;
const MongoConfig = require('./credentials/mongo.config.json');

const mongoURI = (MongoConfig.useLocalDB == true) ? MongoConfig.localServer : MongoConfig.remoteServer;

const connect = () => {
	return new Promise(
		async (resolve) => {
			const client = new MongoClient(mongoURI, {
				useNewUrlParser: true
			});
			await client.connect();
			resolve(client);
		});
};

const insertMany = (collection, data) => {
	return new Promise(
		async (resolve) => {

			const client = await connect();

			const mongoCollection = client.db(MongoConfig.database).collection(collection);
			const result = await mongoCollection.insertMany(data);

			console.log(chalk.blue(`${result.ops.length} items inserted`));
			client.close();

			// console.log(result.insertedCount);
			// console.log(result);

			resolve(result.insertedIds);

		});

};

const insertOne = (item, collection, db) => {

	let targetDB = (db) ? db : MongoConfig.database;

	return new Promise(
		async (resolve) => {

			const client = await connect();

			const mongoCollection = client.db(targetDB).collection(collection);
			const result = await mongoCollection.insertOne(item);

			// console.log(chalk.blue('1 item inserted'));
			client.close();

			// console.log(result.insertedCount);
			// console.log(result.insertedId);
			// console.log(result);

			resolve(result);

		});
};


const find = (collection, query) => {
	return new Promise(
		async (resolve) => {

			const client = await connect();

			const mongoCollection = client.db(MongoConfig.database).collection(collection);
			const result = await mongoCollection.find(query).toArray();

			client.close();
			resolve(result);

		});

};


module.exports = {
	insertOne,
	insertMany,
	find
};