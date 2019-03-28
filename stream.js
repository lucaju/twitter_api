const chalk = require('chalk');
const figures = require('figures');
const readlineAsync = require('readline-async');
const TwitterStreamChannels = require('twitter-stream-channels');

const Mongo = require('./mongo.js');
const twitterCredentials = require('./twitter.credentials.json');
const streamWatchList = require('./config.stream.json');


//----------Init

const twitter = new TwitterStreamChannels(twitterCredentials);
let stream;

consoleListener();
openStream();


function openStream() {

	//
	console.log(chalk.magenta('Twitter stream opened.\n'));
	console.log(chalk('The following keywords will be watched:'));

	for (const ch in streamWatchList) {
		console.log(chalk.blue(ch));
		for (const keyword of streamWatchList[ch]) {
			console.log(chalk.green(`  ${keyword}`));
		}
	}

	console.log('\n');


	// Start stream
	stream = twitter.streamChannels({
		track: streamWatchList
	});

	//Process each channel in separate listeners like these.

	stream.on('channels/napoli-movements', function (tweet) {
		tweet = postProcessing(tweet);
		Mongo.insertOne('twitter-stream', tweet);
	});

	stream.on('channels/web', async function (tweet) {
		tweet = postProcessing(tweet);
		const result = await Mongo.insertOne('twitter-stream', tweet);
		console.log(chalk.blue('web:'), chalk.green(`${tweet.keywords}`), chalk.grey(`${result.insertedCount} item inserted`), figures.tick);
	});

	//post-procesing to remove $ (to save at Mongo DB)
	function postProcessing(tweet) {
		tweet.keywords = tweet.$keywords;
		delete tweet.$keywords;
		delete tweet.$channels;

		return tweet;
	}

}

// inteleration with the console. Type 'close' or 'exit' to close the stream
async function consoleListener() {
	let close;
	while (!close) {
		const line = await readlineAsync();
		if (line == 'close' || line == 'exit') {
			closeStream();
			close = true;
		}
	}
}

function closeStream() {
	stream.stop();//closes the stream connected to Twitter
	console.log('Twitter stream closed');
}