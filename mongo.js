const chalk = require('chalk');
const MongoClient = require('mongodb').MongoClient;

//Mongo DB
const useRemoteMongoDB = false; //false
let mongoURI = 'mongodb://localhost:27017';
if (useRemoteMongoDB) mongoURI = 'mongodb+srv://lucaju:Dreaming.80@fluxoart-ik2c8.gcp.mongodb.net/test?retryWrites=true';

const MongoAPI = function MongoAPI() {

	const mongoConnect = function mongoConnect() {
		return new Promise(
			(resolve) => {
				const client = new MongoClient(mongoURI, { useNewUrlParser: true });
				client.connect(err => {

					if (err) {
						console.error(err);
						return;
					}
					// console.log('mongo connected')
					resolve(client);
				});
			});
	};

	this.insertMany = function insertMany(collection,data) {
		return new Promise(
			(resolve) => {
				mongoConnect()
					.then(client => {

						const mongoCollection = client.db('napoli-social-movements').collection(collection);
						// console.log('mongo saving')

						mongoCollection.insertMany(data)
							.then(result => {
								// console.log(chalk.blue(`${result.ops.length} items inserted`));
								client.close();
								// console.log('mongo disconected')
								resolve(result.ops);
							})
							.catch(err => {
								console.log(chalk.red(err));
							});

					}).catch(err => {
						console.log(chalk.red(err));
					});
			});
	};

	this.insertOne = function insertOne(collection,item) {
		
		return new Promise(
			(resolve) => {
				mongoConnect()
					.then(client => {

						const mongoCollection = client.db('napoli-social-movements').collection(collection);

						mongoCollection.insertOne(item)
							.then(result => {
								console.log(chalk.blue(`1 item inserted`));
								client.close();
								// console.log('mongo disconected')
								resolve(result.ops);
							})
							.catch(err => {
								console.log(chalk.red(err));
							});

					}).catch(err => {
						console.log(chalk.red(err));
					});
			});
	};


	this.find = function find(collection,query) {
		return new Promise(
			(resolve) => {
				mongoConnect()
					.then(client => {

						const mongoCollection = client.db('napoli-social-movements').collection(collection);

						mongoCollection.find(query).toArray()
							.then(result => {
								// console.log(result);
								client.close();
								resolve(result);
							})
							.catch(err => {
								console.log(chalk.red(err));
							});

					}).catch(err => {
						console.log(chalk.red(err));
					});
			});
	};

}

module.exports = new MongoAPI;