require('dotenv').config();
const chalk = require('chalk');
const mongoose = require('mongoose');

const mongoDB = require('./src/db/mongoDB');
const tweetSchema = require('./src/schemas/tweet');


process.title = 'Find Tweets';


const collection = 'housing';								//collection		STRING

const query = {
	// 'user.name': 'Francesco Marino',						//name				STRING
	// lang: 'it',											//lang				STRING
	// retweeted: false,									//retweeted			BOOLEAN
	// 'place.country': 'Italy',							//country.country	STRING
	// 'place.name': 'Naples',								//placename			STRING
	// 'entities.hashtags.text': ['italia', 'racism'],		//hastags			ARRAY[STRING]
	// 'text': /bastardi/i,									//text				STRING - search *like* regex 
	// created_at:  {										//created_at		OBJECT {START/END: DATE|STRING}
	// 	start: '2019-04-04',
	// 	end: '2019-04-10'
	// }
};

const find = async (collection, query) => {

	//Start DB
	await mongoDB.connect();

	console.log(chalk.magenta(`${process.title}\n`));
	console.log(chalk.magenta(`Collection: ${collection}\n`));

	//date period
	if (query.created_at) query.created_at = getDate(query.created_at);

	//hashtags
	const hashtags = getHashtags(query['entities.hashtags.text']);
	delete query['entities.hashtags.text'];

	console.log(chalk.blue('Query:'));
	console.log(query);
	console.log(`Hashtags: ${hashtags}`);

	//model
	const Tweets = mongoose.model(`${collection}-tweet`, tweetSchema);

	//get total documents
	const totalDocuments = await Tweets.estimatedDocumentCount();
	console.log(`Total items in ${collection}-tweets: ${totalDocuments}`);

	//Options
	const limit = totalDocuments;
	const selectedFiled = ['created_at', 'text', 'user.name', 'entities.hashtags.text'];

	//QUERY
	const results = await Tweets.find(query).and(hashtags).limit(limit).select(selectedFiled);
	// console.log(results);

	mongoDB.close();

	return results;

};

const getHashtags = hashtags => {

	if (!hashtags) return {};

	let tags = [];

	for (const hashtag of hashtags) {
		tags.push({
			'entities.hashtags.text': hashtag
		});
	}

	return tags;
};

const getDate = dates => {

	if (!dates) return {};

	const period = {
		$gte: new Date(dates.start),
		$lte: new Date(dates.end)
	};

	return period;

};


find(collection, query);