const _ = require('lodash');
const chalk = require('chalk');
const fs = require('fs-extra');
const jsonfile = require('jsonfile');
const luxon = require('luxon');
const Twitter = require('twitter');

const twitterCredentials = require('./twitter.credentials.json');

// const ids = require('./results/ids.json');

// npm install twitter-stream-channels -> to filter tweets by hastag while using stream

//----------------------------------

const client = new Twitter(twitterCredentials);
const today = luxon.DateTime.local();

let rateLimits = {};

getRateLimit()
	.then(() => {
		return getFollowersIDsByName({
			screen_name: 'nicolangrisano'
		});
	})
	.then(res => {
		return getUsersInfoByID(res);
	})
	.then(res => {
		return saveJson(res);
	})
	.then(() => {
		console.log(chalk.blue('end'));
	});



function getFollowersIDsByName(params) {

	return new Promise(
		(resolve, reject) => {

			const endpoint = '/followers/ids';
			const familyResource = 'followers';

			const requestParams = {
				screen_name: params.screen_name,
				stringify_ids: true,
				count: 1000, //max: 5000,
				cursor: -1,
			};

			if (params.cursor) requestParams.cursor = params.cursor;

			let list = [];
			if (params.partialList) list = params.partialList;

			const resourceremaining = rateLimits[familyResource][endpoint].remaining;
			console.log(rateLimits[familyResource][endpoint]);

			if (resourceremaining > 0) {

				rateLimits[familyResource][endpoint].remaining--;

				client.get(endpoint, requestParams)
					.then(function (res) {

						list = _.concat(list, res.ids);

						if (res.next_cursor_str != '0') {

							getFollowersIDsByName({
								cursor: res.next_cursor_str,
								partialresults: list
							});

						} else {

							console.log(chalk.green(`Followers IDs: ${list.length}`));

							resolve({
								originUser: requestParams.screen_name,
								data: list
							});

						}

					})
					.catch(function (err) {
						console.log(err);
						reject(err);
						throw err;
					});

			} else {

				//to be implemented
				//handle a timer to wait until the next window

			}

		});

}

function getUsersInfoByID(params) {

	function getUser(params) {

		return new Promise(
			(resolve, reject) => {
	
				const endpoint = '/users/lookup';
				const familyResource = 'users';
	
				const requestParams = {
					user_id: params.join(),
					count: 100 // max: 100
				};
	
				const resourceremaining = rateLimits[familyResource][endpoint].remaining;
				console.log(rateLimits[familyResource][endpoint]);
	
				if (resourceremaining > 0) {
	
					rateLimits[familyResource][endpoint].remaining--;
	
					client.post(endpoint, requestParams)
						.then(res => {
	
							console.log(chalk.green(`Followers Info: ${params.length}`));
							resolve(res);
	
						})
						.catch(function (err) {
							console.log(err);
							reject(err);
							throw err;
	
						});
	
				} else {
	
					//to be implemented
					//handle a timer to wait until the next window
	
				}
	
			});
	
	}

	return new Promise(
		(resolve, reject) => {

			let idList = params.data;
			idList = _.chunk(idList, 100); // create batches of 100

			// for (let arr of idList) {
			// 	arr.join();
			// }

			Promise.all(idList.map(getUser))
				.then(res => {
					const userlist = _.flattenDeep(res);
					console.log(chalk.blue(`Followers Info: ${userlist.length}`));
					resolve({
						originUser: params.originUser,
						data: userlist
					});
				})
				.catch(function (err) {
					console.log(err);
					reject(err);
					throw err;

				});

		});

}




function getRateLimit(familyResource, endpoint) {

	return new Promise(
		(resolve, reject) => {

			const params = {
				resources: familyResource
			};

			client.get('application/rate_limit_status', params)
				.then(function (res) {
					if (familyResource) {
						rateLimits[endpoint] = res.resources[familyResource][endpoint];
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
function saveJson(params) {

	return new Promise(
		(resolve, reject) => {

			const folder = './results';
			const fileName = `${params.originUser}-${today.toFormat('yyyy-LL-dd')}.json`;

			console.log(chalk.dim('-----------------'));
			console.log(`Writing data to ${folder}/${fileName}`);

			if (!fs.existsSync(folder)) fs.mkdirSync(folder);

			//payload
			const results = {
				title: params.originUser,
				date: today.toFormat('yyyy-LL-dd'),
				data: params.data
			};

			//Save Json file
			jsonfile.writeFile(`${folder}/${fileName}`, results, {
				spaces: 4
			}, function (err) {
				if (err) {
					console.log(err);
					reject(err);
				} else {
					console.log(chalk.green('Json: Data written!'));
					resolve(results);
				}
			});

		});

}