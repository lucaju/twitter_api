require('dotenv').config();
const chunk = require ('lodash/chunk');
const concat = require ('lodash/concat');
const flattenDeep = require ('lodash/flattenDeep');
const argv = require('minimist')(process.argv.slice(2));
const chalk = require('chalk');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const jsonfile = require('jsonfile');
const log = require('single-line-log').stdout;
const luxon = require('luxon');
const Timer = require('tiny-timer');
const Twitter = require('twit');

// const twitterCredentials = require('./src/credentials/twitter.credentials.json');
const screen_names = require('./src/config/config.followers.json');


//----------Init

const twitter = new Twitter({
	consumer_key: process.env.twitter_consumer_key,
	consumer_secret: process.env.twitter_consumer_secret,
	access_token: process.env.twitter_access_token,
	access_token_secret: process.env.twitter_access_token_secret
});

let screen_name_collection = [];
let rateLimits = {};

//----------------------------------

//Initical Setup
if (argv.users) {

	// Parser CLI variables
	screen_name_collection = argv.users.split(',');
	start();

} else if (screen_names.length > 0) {

	// Get data from Json 
	screen_name_collection = screen_names;
	start();

} else {
	// ask - setup question in the beginning
	inquirer
		.prompt([
			{
				type: 'input',
				name: 'users',
				message: 'Type users\' screen name from who you want get a list of followers (separate users by comma[,]): '
			},
		])
		.then(res => {
			if (res.users.length > 0) {
				screen_name_collection = res.users.split(',');
				start();
			}
		});

}


//----------------------------------

async function start() {

	console.log(chalk.keyword('orange')('Start'));
	
	await getRateLimit();

	//get followers
	for (const user of screen_name_collection) {
		const userAcountInfo = await getUserInfo(user);
		const IDs = await getFollowersIDsByName(userAcountInfo);
		const followersList = await getUsersInfoByID(userAcountInfo,IDs);
		await saveJson('followers', userAcountInfo, followersList);
	}

	console.log(chalk.keyword('orange')('End'));
}


//----------------------------------


const getUserInfo = async user => {

	console.log(chalk.blue(`Get ${user}'s info`));

	//set endpoint
	const familyResource = 'users';
	const endpoint = '/users/show';

	//parameters
	const params = { screen_name: user };

	//check locally stored limit (wait for new window if needed)
	await checkLimit(familyResource, `${endpoint}/:id`);

	//decrease remaining calls available
	// console.log('current limit: ', rateLimits[familyResource][endpoint].remaining);
	rateLimits[familyResource][`${endpoint}/:id`].remaining--;

	//Call Twitter API
	const results = await twitter.get(endpoint, params);

	// console.log(results.data);
	return results.data;

};


//----------------------------------


// get followers ID
const getFollowersIDsByName = async userInfo => {

	console.log(chalk.blue(`Get ${userInfo.screen_name}'s Followers (IDs)`));

	//set list to store all IDs
	let idList = [];

	//build Twitter API request
	let requestParams = {
		screen_name: userInfo.screen_name,
		stringify_ids: true,
		count: 5000, //max: 5000,
		cursor: -1,
	};

	//repeated calls while exist pages of followers available
	while (requestParams.cursor != 0) {

		//call funcion to access API
		const res = await getFollowers(requestParams);

		//save cursor and data
		requestParams.cursor = res.data.next_cursor_str;
		idList = concat(idList, res.data.ids);

		//save partial list
		saveJson('followers-ids-partial', userInfo, idList);

		console.log(chalk.gray(`  Number of Followers (IDs) (partial): ${idList.length}`));
	}

	//------------ finally
	console.log(chalk.cyan(`Number of Followers (IDs): ${idList.length}`));

	//save list as json
	saveJson('followers-ids', userInfo, idList);

	//remove partial
	removePartialResultsFile(userInfo, 'followers-ids-partial');

	//resolve
	return idList;

};

const getFollowers = async params => {

	//set endpoint
	const familyResource = 'followers';
	const endpoint = '/followers/ids';

	//check locally stored limit (wait for new window if needed)
	await checkLimit(familyResource, endpoint);

	//decrease remaining calls available
	// console.log('current limit: ', rateLimits[familyResource][endpoint].remaining);
	rateLimits[familyResource][endpoint].remaining--;

	//Call Twitter API
	// console.log(params);
	const results = await twitter.get(endpoint, params);

	// console.log(results.data);
	return results;

};


//----------------------------------


const getUsersInfoByID = async (userInfo,idList) => {

	console.log(chalk.blue(`Get ${userInfo.screen_name}'s Followers Info`));

	// create batches of 100
	idList = chunk(idList, 100);

	//store users info
	let userlist = [];

	for (let L of idList) {
		const res = await getUsers(L);
		userlist = concat(userlist, res.data);
		userlist = flattenDeep(userlist);

		//save partial list
		saveJson('followers-partial', userInfo, userlist);

		console.log(chalk.gray(`  Followers Info (partial): ${userlist.length}`));
	}

	//------------ finally
	console.log(chalk.cyan(`Number of Followers: ${userlist.length}`));
	console.log('----------------');

	//save list as json
	// saveJson('followers-info', userInfo, userlist);

	//remove partial info and list of ids
	removePartialResultsFile(userInfo, 'followers-partial');
	removePartialResultsFile(userInfo, 'followers-ids');

	//resolve
	return userlist;

};

const getUsers = async params => {

	//parameters
	const requestParams = {
		user_id: params.join(),
		count: 100 // max: 100
	};

	//endpoint
	const endpoint = '/users/lookup';
	const familyResource = 'users';

	//check locally stored limit (wait for new window if needed)
	await checkLimit(familyResource, endpoint);

	//decrease remaining calls available
	// console.log('current limit: ', rateLimits[familyResource][endpoint].remaining);	
	rateLimits[familyResource][endpoint].remaining--;
	
	//Call Twitter API
	const result = await twitter.post(endpoint, requestParams);

	//continue
	return result;
};

//----------------------------------

const checkLimit = async (familyResource, endpoint) => {

	//number of calls remaining\
	const resourceremaining = rateLimits[familyResource][endpoint].remaining;
	// console.log(rateLimits[familyResource][endpoint]);

	//continue if there is resource available
	if (resourceremaining > 0) return true;

		
	//wait next window
	console.log(chalk.dim('------------\n You have reached the rate limit of this endpoint. Waiting for the next window. Do not close the app!'));

	// build timer to wait until next window
	const reset = rateLimits[familyResource][endpoint].reset;
	await timer(reset);

	//reset local limits.
	await getRateLimit(familyResource, endpoint);

	//continue
	return true;
};

const timer = reset => {

	//transform time to reset into interval (duration)
	const now = luxon.DateTime.local();
	const resetTime = luxon.DateTime.fromSeconds(reset);
	const blockageInterval = luxon.Interval.fromDateTimes(now, resetTime);

	// Timer
	const timer = new Timer();

	timer.on('tick', (ms) => {
		// const tick = luxon.DateTime.fromMillis(s);
		//print time
		const tick = luxon.Duration.fromObject({
			milliseconds: ms
		});
		log(chalk.yellow(tick.toFormat('m:ss')));
	});

	timer.on('done', () => {
		//end timer
		return 'Timer ended';
	});

	// timer.on('statusChanged', (status) => console.log('status:', status));

	//start timer
	timer.start(blockageInterval.length('milliseconds'), 1000); // run for 5 seconds

};

//----------------------------------

async function getRateLimit (familyResource, endpoint) {

	const params = { resources: familyResource };

	const rateLimitsStatus = await twitter.get('application/rate_limit_status', params);

	if (familyResource) {
		rateLimits[familyResource][endpoint] = rateLimitsStatus.data.resources[familyResource][endpoint];
	} else {
		rateLimits = rateLimitsStatus.data.resources;
	}

	return rateLimits;
				
}

//----------------------------------

const saveJson = async (feature, userInfo, data) => {

	const now = luxon.DateTime.local();
	const folder = './results';
	const fileName = `${userInfo.screen_name}-${feature}-${now.toFormat('yyyy-LL-dd')}.json`;

	if (!fs.existsSync(folder)) fs.mkdirSync(folder);

	//payload
	const dataset = {
		userName: userInfo.screen_name,
		date: now.toLocaleString(luxon.DateTime.DATETIME_FULL),
		userInfo: userInfo,
		followers: data
	};

	const jsonOptions = {
		spaces: 4
	};

	//Save Json file
	await jsonfile.writeFile(`${folder}/${fileName}`, dataset, jsonOptions);

};

const removePartialResultsFile = (user,feature) => {
	const now = luxon.DateTime.local();
	const folder = './results';
	const fileName = `${user.screen_name}-${feature}-${now.toFormat('yyyy-LL-dd')}.json`;
	fs.remove(`${folder}/${fileName}`);
};