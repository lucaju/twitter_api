
const chalk = require('chalk');
const mongoose = require('mongoose');

const mongoURI = (process.env.useLocalDB == 'true') ? process.env.MONGODB_LOCAL_URL : process.env.MONGODB_REMOTE_URL;

const connect = async () => {

	try {
		await mongoose.connect(mongoURI, {
			useNewUrlParser: true,
			useCreateIndex: true
		});
		return true;

	} catch (err) {
		console.log(chalk.red(err.name));
	}
};

const close = () => {
	mongoose.connection.close();
};

module.exports = {
	connect,
	close
};