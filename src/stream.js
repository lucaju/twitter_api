const chalk = require('chalk');
const figures = require('figures');
const luxon = require('luxon');
const readlineAsync = require('readline-async');
const TwitterStreamChannels = require('twitter-stream-channels');

const mongo = require('./mongo.js');
const twitterCredentials = require('./credentials/twitter.credentials.json');
const streamWatchList = require('./config.stream.json');


process.title = 'Node Twitter Stream';

//----------Init

const twitter = new TwitterStreamChannels(twitterCredentials);
let stream;

consoleListener();
openStream();


function openStream() {

	//
	console.log(chalk.magenta('Twitter stream opened.\n'));
	console.log(chalk('The following keywords will be watched:'));

	// Start stream
	stream = twitter.streamChannels({
		track: streamWatchList
	});

	//loop throuhg track channels
	for (const ch in streamWatchList) {
		console.log(chalk.blue(ch));
		for (const keyword of streamWatchList[ch]) {
			console.log(chalk.green(`  ${keyword}`));
			
		}
		//Process each channel in separate listeners like these.
		stream.on(`channels/${ch}`, function (tweet) {
			processTweet(tweet, ch);
		});
	}

	console.log(chalk.white('Type "close" to exit.\n'));

	

	// stream.on('channels/napoli-social-movements', function (tweet) {
	// 	processTweet(tweet, 'napoli-social-movements');
	// });

	// stream.on('channels/web', function (tweet) {
	// 	processTweet(tweet, 'web');
	// });

	async function processTweet(tweet, ch) {

		tweet = fixAttributes(tweet);
		const now = luxon.DateTime.local();

		await mongo.insertOne(tweet,`twitter-stream-${ch}`, 'napoli-social-movements');

		let hastags = [];
		for (const tag of tweet.entities.hashtags) {
			hastags.push(tag.text);
		}

		console.log(
			chalk.grey(`[${now.toLocaleString(luxon.DateTime.DATETIME_MED)}]`),
			chalk.keyword('orange')(ch),
			chalk.green(`${hastags.concat()}`),
			// chalk.grey(`${result.insertedCount} item inserted`),
			figures.tick
		);

	}

	//post-procesing to remove $ (to save at Mongo DB)
	function fixAttributes(tweet) {
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