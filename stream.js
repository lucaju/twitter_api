const _ = require('lodash');
const argv = require('minimist')(process.argv.slice(2));
const chalk = require('chalk');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const jsonfile = require('jsonfile');
const log = require('single-line-log').stdout;
const luxon = require('luxon');
// const Twitter = require('twitter');
const TwitterStreamChannels = require('twitter-stream-channels');

const Mongo = require('./mongo.js');
// const twitterCredentials = require('./twitter.credentials.json');
const twitterCredentials = require('./twitter.credentials2.json');
const streamWatchList = require('./config.stream.json');

// npm install twitter-stream-channels -> to filter tweets by hastag while using stream

//----------Init
// const mongo = new Mongo();
// const client = new Twitter(twitterCredentials);
// const client = new TwitterStreamChannels(twitterCredentials);
const client = new TwitterStreamChannels(twitterCredentials);
const now = luxon.DateTime.local();

let stream;
let watchList = [];

start();

//----------------------------------

function start() {

	// console.log(chalk.blue('Starting'));
	openStream();
	// console.log(Mongo);
	// console.log(mongo.mongoConnect());
}



function openStream() {
	console.log(watchList);

	let channels = {
		'languages' : ['javascript','php','java','python','perl'],
		'js-frameworks' : ['angularjs','jquery','backbone','emberjs'],
		'web' : ['javascript','nodejs','html5','css','angularjs']
	};

	//params
	stream = client.streamChannels({track:streamWatchList});

	stream.on('channels/napoli-movements',function(tweet){

		console.log(chalk.blue('napoli'));
		//some processing
		tweet.keywords = tweet.$keywords;
		delete tweet.$keywords;
		delete tweet.$channels;

		console.log(tweet.text);
		Mongo.insertOne('twitter-stream', tweet);
	});

	stream.on('channels/web',function(tweet){

		console.log(chalk.yellow('web'));
		

		// //some processing
		// tweet.keywords = tweet.$keywords;
		// delete tweet.$keywords;
		// delete tweet.$channels;

		// console.log('>web',tweet.text);//any tweet with 'javascript','nodejs','html5','css','angularjs'
		// Mongo.insertOne('twitter-stream', tweet);
	});
}