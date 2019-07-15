require('dotenv').config();
const chalk = require('chalk');
// const luxon = require('luxon');
const mongoose = require('mongoose');

const mongoDB = require('./src/mongo/mongoDB');
const tweetSchema = require('./src/schemas/tweet');


process.title = 'Find Tweets';

const c = 'housing';
const q = {
	// 'user.name': 'Francesco Marino',
	// lang: 'it',
	// retweeted: false,
	// 'place.country': 'Italy',
	// 'place.name': 'Naples',
	// 'entities.hashtags.text': ['Juventus']
	// 'text': /bastardi/i
};

const getHashtags = hashtags => {

	if (!hashtags) return {};

	let tags = [];

	for (const hashtag of hashtags) {
		tags.push({'entities.hashtags.text': hashtag});
	}

	return tags;
};

const find = async (query, collection) => {

	//Start DB
	await mongoDB.connect();

	console.log(chalk.magenta(`${process.title}\n`));
	console.log(chalk.magenta(`Collection: ${collection}`));

	const hashtags = getHashtags(query['entities.hashtags.text']);
	delete query['entities.hashtags.text'];
		
	console.log(chalk.blue('Query:'));
	console.log(query);
	console.log(hashtags);
	

	const Tweets = mongoose.model(`${collection}-tweet`, tweetSchema);
	console.log(Tweets);


	const results = await Tweets.find(query).and(hashtags);

	console.log(results.length);

	mongoDB.close();

};

find(q,c);
