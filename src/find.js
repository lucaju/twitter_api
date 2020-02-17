require('dotenv').config();
const chalk = require('chalk');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs-extra');
const jsonfile = require('jsonfile');
const mongoose = require('mongoose');

const mongoDB = require('./db/mongoDB');
const tweetSchema = require('./schemas/tweet');

const mongoQuery = require('./config/config.find.json');


process.title = 'Find Tweets';


const collection = 'housing';								//collection		STRING

const query = {
	// 'user.name': 'Francesco Marino',						//name				STRING
	// 'text': 'black',										//text				STRING - search *like* regex
	// retweeted: false,									//retweeted			BOOLEAN
	// lang: 'it',											//lang				STRING
	// 'place.country': 'Italy',							//country.country	STRING
	// 'place.name': 'Naples',								//placename			STRING
	// 'entities.hashtags.text': ['Napoli'],		//hastags			ARRAY[STRING]
	created_at:  {										//created_at		OBJECT {START/END: DATE|STRING}
		start: '2019-04-04',
		end: '2019-04-11'
	}
};

const options = {
	// limit: 10,
	selectedFields: [
		// 'created_at',
		// 'text',
		// 'user.name',
		// 'entities.hashtags.text'
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
	const results = await Tweets.find(query)
		.and(hashtags)
		.limit(limit)
		.select(selectedFiled);

	console.log(results.length);

	// saveJson(results);
	// parseHashtagNetwork(results);
	parseUserNetwork(results);

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

const saveJson = async data => {

	const folder = './results/find';
	const fileName = 'results_partial.json';

	if (!fs.existsSync(folder)) fs.mkdirSync(folder);

	const jsonOptions = { spaces: 4 };

	//Save Json file
	await jsonfile.writeFile(`${folder}/${fileName}`, data, jsonOptions);

	console.log (chalk.green(`JSON file saved at ${folder}`));

};

const parseHashtagNetwork = async data => {
	const relationship = [];

	// console.log(data[0].toObject())
	
	for (const tweet of data) {

		const tw = tweet.toObject();

		// if (!tw.entities) continue;

		if (tw.entities.hashtags.length === 0) continue;
		
		const name = tw.user.name;

		for (const hashtag of tw.entities.hashtags) {
			relationship.push({
				source: name,
				target: hashtag.text
			})
		}

	}

	saveCSV(relationship, 'hashtag_network_partial');
};

const parseUserNetwork = async data => {
	
	const relationship = [];

	for (const tweet of data) {

		const tw = tweet.toObject();

		// console.log(tw);

		if (tw.is_quote_status === true && tw.quoted_status) {;
		
			const source = tw.user.name;
			console.log(tw.quoted_status.user.name);
			console.log('------');
			const target = tw.quoted_status.user.name;

			relationship.push({source, target})
		}

	}

	saveCSV(relationship, 'user_network_partial');
};

const saveCSV = (data, filename) => {

	const csvWriter = createCsvWriter({
		path: `results/find/${filename}.csv`,
		header: [
			{id: 'source', title: 'SOURCE'},
			{id: 'target', title: 'TARGET'}
		]
	});
	 
	csvWriter.writeRecords(data)       // returns a promise
		.then(() => {
			console.log('...Done');
		});
}


find(collection, query);