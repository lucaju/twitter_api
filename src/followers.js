const _ = require('lodash');
const argv = require('minimist')(process.argv.slice(2));
const chalk = require('chalk');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const jsonfile = require('jsonfile');
const log = require('single-line-log').stdout;
const luxon = require('luxon');
const Timer = require('tiny-timer');
const Twitter = require('twit');

const twitterCredentials = require('./credentials/twitter.credentials.json');
const screen_names = require('./config.followers.json');


//----------Init

const twitter = new Twitter(twitterCredentials);

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
	
	//get rate limits()
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


async function getUserInfo(user) {

	console.log(chalk.blue(`Get ${user}'s info`));

	//set endpoint
	const familyResource = 'users';
	const endpoint = '/users/show';

	//parameters
	const params = {
		screen_name: user,
	};

	return new Promise(
		async (resolve) => {
			//check locally stored limit (wait for new window if needed)
			await checkLimit(familyResource, `${endpoint}/:id`);

			//decrease remaining calls available
			// console.log('current limit: ', rateLimits[familyResource][endpoint].remaining);
			rateLimits[familyResource][`${endpoint}/:id`].remaining--;

			//Call Twitter API
			const results = await twitter.get(endpoint, params);

			// console.log(results.data);
			resolve(results.data);

		});
}


//----------------------------------


// get followers ID
async function getFollowersIDsByName(userInfo) {

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

	return new Promise(
		async (resolve) => {

			//repeated calls while exist pages of followers available
			while (requestParams.cursor != 0) {

				//call funcion to access API
				const res = await getFollowers(requestParams);

				//save cursor and data
				requestParams.cursor = res.data.next_cursor_str;
				idList = _.concat(idList, res.data.ids);

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
			resolve(idList);

		});


	function getFollowers(params) {

		//set endpoint
		const familyResource = 'followers';
		const endpoint = '/followers/ids';

		return new Promise(
			async (resolve) => {

				//check locally stored limit (wait for new window if needed)
				await checkLimit(familyResource, endpoint);

				//decrease remaining calls available
				// console.log('current limit: ', rateLimits[familyResource][endpoint].remaining);
				rateLimits[familyResource][endpoint].remaining--;

				//Call Twitter API
				// console.log(params);
				const results = await twitter.get(endpoint, params);

				// console.log(results.data);
				resolve(results);

			});

	}

}


//----------------------------------


async function getUsersInfoByID(userInfo,idList) {

	console.log(chalk.blue(`Get ${userInfo.screen_name}'s Followers Info`));

	// create batches of 100
	idList = _.chunk(idList, 100);

	//store users info
	let userlist = [];

	return new Promise(
		async (resolve) => {

			for (let L of idList) {
				const res = await getUsers(L);
				userlist = _.concat(userlist, res.data);
				userlist = _.flattenDeep(userlist);

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
			resolve(userlist);

		});

	function getUsers(params) {

		//parameters
		const requestParams = {
			user_id: params.join(),
			count: 100 // max: 100
		};

		//endpoint
		const endpoint = '/users/lookup';
		const familyResource = 'users';

		return new Promise(
			async (resolve) => {

				//check locally stored limit (wait for new window if needed)
				await checkLimit(familyResource, endpoint);

				//decrease remaining calls available
				// console.log('current limit: ', rateLimits[familyResource][endpoint].remaining);	
				rateLimits[familyResource][endpoint].remaining--;
				
				//Call Twitter API
				const result = await twitter.post(endpoint, requestParams);

				//continue
				resolve(result);

			});
	}

}

//----------------------------------

async function checkLimit(familyResource, endpoint) {

	return new Promise(
		async (resolve) => {

			//number of calls remaining\
			const resourceremaining = rateLimits[familyResource][endpoint].remaining;
			// console.log(rateLimits[familyResource][endpoint]);

			if (resourceremaining > 0) {

				//continue if there is resource available
				resolve(true);

			} else {

				//wait next window
				console.log(chalk.dim('------------\n You have reached the rate limit of this endpoint. Waiting for the next window. Do not close the app!'));

				// build timer to wait until next window
				const reset = rateLimits[familyResource][endpoint].reset;
				await timer(reset);

				//reset local limits.
				await getRateLimit(familyResource, endpoint);

				//continue
				resolve(true);
			}

		});
}

function timer(reset) {

	return new Promise(
		(resolve) => {

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
				resolve('Timer ended');
			});

			// timer.on('statusChanged', (status) => console.log('status:', status));

			//start timer
			timer.start(blockageInterval.length('milliseconds'), 1000); // run for 5 seconds

		});
}

//----------------------------------

function getRateLimit(familyResource, endpoint) {

	return new Promise(
		async (resolve) => {

			const params = {
				resources: familyResource
			};

			const rateLimitsStatus = await twitter.get('application/rate_limit_status', params);

			if (familyResource) {
				rateLimits[familyResource][endpoint] = rateLimitsStatus.data.resources[familyResource][endpoint];
			} else {
				rateLimits = rateLimitsStatus.data.resources;
			}

			resolve(rateLimits);
				
		});
}

//----------------------------------

function saveJson(feature, userInfo, data) {

	return new Promise(
		async (resolve) => {

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
			
			//continue
			resolve();

		});

}

function removePartialResultsFile(user,feature) {
	const now = luxon.DateTime.local();
	const folder = './results';
	const fileName = `${user.screen_name}-${feature}-${now.toFormat('yyyy-LL-dd')}.json`;
	fs.remove(`${folder}/${fileName}`);
}