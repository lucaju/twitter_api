require('dotenv').config();
const chalk = require('chalk');
const chunk = require('lodash/chunk');
const flattenDeep = require('lodash/flattenDeep');
const fs = require('fs-extra');
const jsonfile = require('jsonfile');
const log = require('single-line-log').stdout;
const luxon = require('luxon');
const mongoose = require('mongoose');
const Timer = require('tiny-timer');
const Twitter = require('twit');

const runtimeArgv = require('./followers/runtime-argv');
const runtimeInquerer = require('./followers/runtime-inquerer');

const followersSchema = require('./schemas/followers');
const mongoDB = require('./db/mongoDB');

const config = require('./config/config.followers.json');

//----------Init

const twitter = new Twitter({
  consumer_key: process.env.twitter_consumer_key,
  consumer_secret: process.env.twitter_consumer_secret,
  access_token: process.env.twitter_access_token,
  access_token_secret: process.env.twitter_access_token_secret,
});

let useJSON = true;
let useDB = false;
let rateLimits = {};

//----------------------------------

//Initial Setup
(async () => {
  let userNames;

  if (runtimeArgv.users) {
    userNames = parseCLI();
  } else if (config.users.length > 0) {
    userNames = parseConfigFile();
  } else {
    userNames = parseRealtimeInquerer();
  }

  start(userNames);
})();

function parseCLI() {
  if (runtimeArgv.users[0] == '') {
    return console.log(chalk.red('You must list at least one user!'));
  }
  if (runtimeArgv.useJSON !== undefined) useJSON = runtimeArgv.useJSON;
  if (runtimeArgv.useDB !== undefined) useDB = runtimeArgv.useDB;

  return runtimeArgv.users;
}

function parseConfigFile() {
  if (config.useJSON !== undefined) useJSON = config.useJSON;
  if (config.useDB !== undefined) useDB = config.useDB;

  return config.users;
}

async function parseRealtimeInquerer() {
  const result = await runtimeInquerer();

  useJSON = result.useJSON;
  useDB = result.useDB;

  return result.users.split(',');
}

//----------------------------------

async function start(userNames) {
  console.log(chalk.keyword('orange')('Start\n'));
  console.log(`List of users: ${chalk.keyword('chocolate')(userNames)}\n`);

  await getRateLimit();

  // get followers
  for (const username of userNames) {
    const user = await getUserInfo(username);
    const followersIDs = await getFollowersIDsByName(user);
    const followersList = await getUsersInfoByID(user, followersIDs);

    //user results
    user.collected_at = new Date();
    user.followers = followersList;

    if (useJSON) await saveJson(user);
    if (useDB) await saveToDB(user);

    console.log('----------------\n');
  }

  console.log(chalk.keyword('orange')('\nEnd'));
}

//----------------------------------

const getUserInfo = async (user) => {
  console.log(chalk.blue(`Fetching ${user}'s info\n`));

  const familyResource = 'users';
  const endpoint = '/users/show';
  const params = { screen_name: user };

  //check locally stored limit (wait for new window if needed)
  await checkLimit(familyResource, `${endpoint}/:id`);
  rateLimits[familyResource][`${endpoint}/:id`].remaining--;

  const results = await twitter.get(endpoint, params);
  // console.log(results.data);

  return results.data;
};

//----------------------------------

// get followers ID
const getFollowersIDsByName = async (userInfo) => {
  console.log(chalk.blue(`Fetching ${userInfo.screen_name}'s Followers (IDs)`));

  let idList = [];

  const requestParams = {
    screen_name: userInfo.screen_name,
    stringify_ids: true,
    count: 5000, //max: 5000,
    cursor: -1,
  };

  //repeated calls while exist pages of followers available
  while (requestParams.cursor != 0) {
    const res = await getFollowers(requestParams);

    //save cursor and data
    requestParams.cursor = res.data.next_cursor_str;
    idList = [...idList, ...res.data.ids];

    //save partial list
    // if (useJSON) saveJson('followers-ids-partial', userInfo, idList);

    console.log(chalk.gray(`  Number of Followers (IDs) (partial): ${idList.length}`));
  }

  //------------ finally
  console.log(chalk.cyan(`Number of Followers (IDs): ${idList.length}\n`));

  //save list as json
  // if (useJSON) saveJson('followers-ids', userInfo, idList);

  // if (useJSON) removePartialResultsFile(userInfo, 'followers-ids-partial');

  return idList;
};

const getFollowers = async (params) => {
  const familyResource = 'followers';
  const endpoint = '/followers/ids';

  //check locally stored limit (wait for new window if needed)
  await checkLimit(familyResource, endpoint);
  rateLimits[familyResource][endpoint].remaining--;

  const results = twitter.get(endpoint, params);

  return results;
};

//----------------------------------

const getUsersInfoByID = async (userInfo, idList) => {
  console.log(chalk.blue(`Fetching ${userInfo.screen_name}'s Followers Info`));
  // create batches of 100
  idList = chunk(idList, 100);

  let userlist = [];

  for (let L of idList) {
    const res = await getUsers(L);
    userlist = [...userlist, res.data];
    userlist = flattenDeep(userlist);

    //save partial list
    // if (useJSON) saveJson('followers-partial', userInfo, userlist);

    console.log(chalk.gray(`  Followers Info (partial): ${userlist.length}`));
  }

  //------------ finally
  console.log(chalk.cyan(`Number of Followers: ${userlist.length}\n`));

  //save list as json
  // saveJson('followers-info', userInfo, userlist);

  // if (useJSON) removePartialResultsFile(userInfo, 'followers-partial');
  // if (useJSON) removePartialResultsFile(userInfo, 'followers-ids');

  return userlist;
};

const getUsers = async (params) => {
  const requestParams = {
    user_id: params.join(),
    count: 100, // max: 100
  };

  const endpoint = '/users/lookup';
  const familyResource = 'users';

  //check locally stored limit (wait for new window if needed)
  await checkLimit(familyResource, endpoint);
  rateLimits[familyResource][endpoint].remaining--;

  const result = await twitter.post(endpoint, requestParams);

  return result;
};

//----------------------------------

const checkLimit = async (familyResource, endpoint) => {
  const resourceremaining = rateLimits[familyResource][endpoint].remaining;
  // console.log(rateLimits[familyResource][endpoint]);
  if (resourceremaining > 0) return true;

  //waiting next window
  console.log(
    chalk.dim(`
      ------------
      You have reached the rate limit of this endpoint.
      Waiting for the next window.
      Do not close the app!
      ------------
    `)
  );

  const reset = rateLimits[familyResource][endpoint].reset;
  await timer(reset);
  await getRateLimit(familyResource, endpoint);

  return true;
};

//transform time to reset into interval (duration)
const timer = (reset) => {
  const now = luxon.DateTime.local();
  const resetTime = luxon.DateTime.fromSeconds(reset);
  const blockageInterval = luxon.Interval.fromDateTimes(now, resetTime);

  const timer = new Timer();

  //print time on tick
  timer.on('tick', (ms) => {
    const tick = luxon.Duration.fromObject({
      milliseconds: ms,
    });
    log(chalk.yellow(tick.toFormat('m:ss')));
  });

  timer.on('done', () => 'Timer ended');

  // timer.on('statusChanged', (status) => console.log('status:', status));

  timer.start(blockageInterval.length('milliseconds'), 1000); // run for 5 seconds
};

//----------------------------------

async function getRateLimit(familyResource, endpoint) {
  const params = { resources: familyResource };
  const rateLimitsStatus = await twitter.get('application/rate_limit_status', params);

  if (familyResource) {
    rateLimits[familyResource][endpoint] =
      rateLimitsStatus.data.resources[familyResource][endpoint];
  } else {
    rateLimits = rateLimitsStatus.data.resources;
  }

  return rateLimits;
}

//----------------------------------

const saveJson = async (user) => {
  const now = luxon.DateTime.local();
  const folder = './results/followers';
  const fileName = `${user.screen_name}-${now.toFormat('yyyy-LL-dd')}.json`;

  if (!fs.existsSync(folder)) fs.mkdirSync(folder);

  const jsonOptions = { spaces: 4 };
  await jsonfile.writeFile(`${folder}/${fileName}`, user, jsonOptions);

  console.log(chalk.green(`JSON file saved at ${folder}`));
};

const saveToDB = async (user) => {
  await mongoDB.connect();

  user.followers = convertDate(user.followers);

  const FollowersModel = mongoose.model('twitter-user-followers', followersSchema);
  const userModel = new FollowersModel(user);

  await userModel.save();
  mongoDB.close();

  console.log(chalk.green('User saved to MongoDB'));
};

const convertDate = (followers) => {
  followers.forEach((user) => (user.created_at = new Date(user.created_at)));
  return followers;
};
