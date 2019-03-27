const chalk = require('chalk');
const TwitterStreamChannels = require('twitter-stream-channels');

const Mongo = require('./mongo.js');
const twitterCredentials = require('./twitter.credentials.json');
const streamWatchList = require('./config.stream.json');


//----------Init
const client = new TwitterStreamChannels(twitterCredentials);
let stream;

openStream();

//----------------------------------


function openStream() {

	//params
	stream = client.streamChannels({
		track: streamWatchList
	});
	console.log(chalk.blue('Twitter stream opened.'));
	console.log(chalk.grey(`The following keywords will be watched. ${JSON.stringify(streamWatchList)}`));

	stream.on('channels/napoli-movements', function (tweet) {
		tweet = postProcessing(tweet);
		Mongo.insertOne('twitter-stream', tweet);
	});

	stream.on('channels/web', function (tweet) {
		console.log(chalk.yellow('web'));
		tweet = postProcessing(tweet);
		Mongo.insertOne('twitter-stream', tweet);
	});

	//post-procesing to remove $ (to save at Mongo DB)
	function postProcessing(tweet) {
		tweet.keywords = tweet.$keywords;
		delete tweet.$keywords;
		delete tweet.$channels;

		return tweet;
	}
}