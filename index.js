const _ = require('lodash');
const argv = require('minimist')(process.argv.slice(2));
const chalk = require('chalk');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const jsonfile = require('jsonfile');
const log = require('single-line-log').stdout;
const luxon = require('luxon');
const Timer = require('tiny-timer');
const Twitter = require('twitter');

const twitterCredentials = require('./twitter.credentials.json');
const screen_names = require('./screen_names.json');

// npm install twitter-stream-channels -> to filter tweets by hastag while using stream

//----------Init

const client = new Twitter(twitterCredentials);
const now = luxon.DateTime.local();

let screen_name;
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
	// ask
	setup();
}

//setup question in the beginning
function setup() {

	inquirer
		.prompt([
			{
				type: 'input',
				name: 'users',
				message: 'Set a Twitter screen_name collect their followers: '
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

// if (!screen_name) {

// 	console.log('Set a Twitter screen_name collect their followers');

// } else {

// 	getFollowersIDsByName(screen_name).then(res => {
// 		return getUsersInfoByID(res);
// 	}).then(() => {
// 		console.log(chalk.blue('end'));
// 	});
// }

async function start() {
	// getFollowersIDsByName(screen_name).then(res => {
	// 	return getUsersInfoByID(res);
	// }).then(() => {
	// 	console.log(chalk.blue('end'));
	// });

	for (const user of screen_name_collection) {
		screen_name = user;
		const IDs = await getFollowersIDsByName(screen_name);
		await getUsersInfoByID(IDs);
	}

	console.log(chalk.blue('end'));
}



//----------------------------------


// get followers ID
async function getFollowersIDsByName(screen_name) {

	console.log(chalk.blue(`Get ${screen_name}'s Followers (IDs)`));

	//set list to store all IDs
	let idList = [];

	//build Twitter API request
	let requestParams = {
		screen_name: screen_name,
		stringify_ids: true,
		count: 5000, //max: 5000,
		cursor: -1,
	};

	//get ratelinit()
	await getRateLimit();

	return new Promise(
		async (resolve) => {

			//repeated calls while exist pages of followers available
			while (requestParams.cursor != 0) {

				//call funcion to access API
				const res = await getFollowers(requestParams);

				//save cursor and data
				requestParams.cursor = res.next_cursor_str;
				idList = _.concat(idList, res.ids);

				//save partial list
				saveJson('followers-ids-partial', idList);

				console.log(chalk.green(`Number of Followers (IDs) (partial): ${idList.length}`));
			}

			//------------ finally
			console.log(chalk.blue(`Number of Followers (IDs): ${idList.length}`));
			console.log('*************');

			//save list as json
			saveJson('followers-ids', idList);

			//remove partial
			removePartialResultsFile('followers-ids-partial');

			//resolve
			resolve(idList);


		});


	function getFollowers(params) {

		//set endpoint
		const familyResource = 'followers';
		const endpoint = '/followers/ids';

		return new Promise(
			async (resolve, reject) => {

				//check locally stored limit (wait for new window if needed)
				await checkLimit(familyResource, endpoint);

				//decrease remaining calls available
				// console.log('current limit: ', rateLimits[familyResource][endpoint].remaining);
				rateLimits[familyResource][endpoint].remaining--;

				//Call Twitter API
				client.get(endpoint, params)
					.then(function (res) {
						resolve(res);
					})
					.catch(function (err) {
						console.log(err);
						reject(err);
						throw err;
					});

			});

	}

}

//----------------------------------


async function getUsersInfoByID(idList) {

	console.log(chalk.blue(`Get ${screen_name}'s Followers Info`));

	// create batches of 100
	idList = _.chunk(idList, 100);

	//store users info
	let userlist = [];

	return new Promise(
		async (resolve) => {

			for (let L of idList) {
				const res = await getUsers(L);
				userlist = _.concat(userlist, res);
				userlist = _.flattenDeep(userlist);

				//save partial list
				saveJson('followers-info-partial', userlist);

				console.log(chalk.green(`Followers Info (partial): ${userlist.length}`));
			}

			//------------ finally
			console.log(chalk.blue(`Number of Followers Info: ${userlist.length}`));
			console.log('----------------');

			//save list as json
			saveJson('followers-info', userlist);

			//remove partial
			removePartialResultsFile('followers-info-partial');

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
			async (resolve, reject) => {

				//check locally stored limit (wait for new window if needed)
				await checkLimit(familyResource, endpoint);

				//decrease remaining calls available
				// console.log('current limit: ', rateLimits[familyResource][endpoint].remaining);	
				rateLimits[familyResource][endpoint].remaining--;

				//Call Twitter API
				client.post(endpoint, requestParams)
					.then(res => {
						resolve(res);
					})
					.catch(function (err) {
						console.log(err);
						reject(err);
						throw err;

					});

			});
	}

}

//----------------------------------

async function checkLimit(familyResource, endpoint) {

	return new Promise(
		async (resolve) => {

			//number of calls remaining
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
			let resetTime = luxon.DateTime.fromSeconds(reset);
			let blockageInterval = luxon.Interval.fromDateTimes(now, resetTime);

			// console.log(chalk.green(blockageInterval));

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
		(resolve, reject) => {

			const params = {
				resources: familyResource
			};

			client.get('application/rate_limit_status', params)
				.then(function (res) {
					if (familyResource) {
						rateLimits[familyResource][endpoint] = res.resources[familyResource][endpoint];
					} else {
						rateLimits = res.resources;
					}
					resolve(rateLimits);
				})
				.catch(function (err) {
					console.log(err);
					reject(err);
					throw err;
				});

		});

}

function saveJson(feature, data) {

	return new Promise(
		(resolve, reject) => {

			const folder = './results';
			const fileName = `${screen_name}-${feature}-${now.toFormat('yyyy-LL-dd')}.json`;

			if (!fs.existsSync(folder)) fs.mkdirSync(folder);

			//payload
			const dataset = {
				title: screen_name,
				date: now.toFormat('yyyy-LL-dd'),
				data: data
			};

			const jsonOptions = {
				spaces: 4
			};

			//Save Json file

			jsonfile.writeFile(`${folder}/${fileName}`, dataset, jsonOptions)
				.then(res => {
					// console.log(chalk.green('Json: Data written!'));
					resolve(res);
				})
				.catch(err => {
					console.error(err);
					reject(err);
				});

		});

}

function removePartialResultsFile(feature) {
	const folder = './results';
	const fileName = `${screen_name}-${feature}-${now.toFormat('yyyy-LL-dd')}.json`;
	fs.remove(`${folder}/${fileName}`);
}





// client.get('statuses/user_timeline', params, function (error, tweets, response) {
//   console.log(error)
//   if (!error) {
//     console.log(tweets);
//   }
// });

// client.get('statuses/user_timeline', params)
// 	.then(function (res) {
// 		console.log(res);
// 	})
// 	.catch(function (error) {
// 		throw error;
// 	})

// var stream = client.stream('statuses/filter', {
// 	track: 'javascript'
// });

// stream.on('data', function (event) {
// 	console.log('-----')
// 	// console.log(event && event.text);
// 	console.log(event);
// 	console.log('-----\n')

// const isTweet = _.conforms({
// contributors: _.isObject,
// id_str: _.isString,
// text: _.isString,
// })
// });

// stream.on('error', function (error) {
// 	throw error;
// });

//get JSON