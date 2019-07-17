require('dotenv').config();
const chalk = require('chalk');
const mongoose = require('mongoose');

const mongoDB = require('./src/db/mongoDB');
const tweetSchema = require('./src/schemas/tweet');

const mongoQuery = require('./src/config/config.find.json');


process.title = 'Find Tweets';


const collection = 'housing';								//collection		STRING

const query = {
	// 'user.name': 'Francesco Marino',						//name				STRING
	// 'text': 'black',										//text				STRING - search *like* regex
	// retweeted: false,									//retweeted			BOOLEAN
	// lang: 'it',											//lang				STRING
	// 'place.country': 'Italy',							//country.country	STRING
	// 'place.name': 'Naples',								//placename			STRING
	// 'entities.hashtags.text': ['italia', 'racism'],		//hastags			ARRAY[STRING]
	// created_at:  {										//created_at		OBJECT {START/END: DATE|STRING}
	// 	start: '2019-04-04',
	// 	end: '2019-04-10'
	// }
};

const options = {
	limit: 10,
	selectedFields: [
		'created_at',
		'text',
		'user.name',
		'entities.hashtags.text'
	]
};

const find = async (collection, query) => {

	//Start DB
	await mongoDB.connect();

	console.log(chalk.magenta(`${process.title}\n`));
	console.log(chalk.magenta(`Collection: ${collection}\n`));

	//model
	const Tweets = mongoose.model(`${collection}-tweet`, tweetSchema);

	//get total documents
	const totalDocuments = await Tweets.estimatedDocumentCount();

	//date period
	if (query.created_at) query.created_at = getDate(query.created_at);

	//hashtags
	const hashtags = getHashtags(query['entities.hashtags.text']);
	delete query['entities.hashtags.text'];

	//text regex
	if (query.text) query.text = {$regex: query.text, $options: 'i'};

	console.log(chalk.blue('Query:'));
	console.log(query);
	console.log(`Hashtags: ${hashtags}`);

	//Options
	const limit = options.limit > 0 ? options.limit : totalDocuments;
	const selectedFiled = options.selectedFields.length > 0 ? options.selectedFields : {};

	console.log(`Total items in ${collection}-tweets: ${totalDocuments}`);
	console.log(`Limit: ${limit} | selectedFiled: ${selectedFiled}`);

	//QUERY
	const results = await Tweets.find(query).and(hashtags).limit(limit).select(selectedFiled);
	console.log(results);

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