require('dotenv').config();
const chalk = require('chalk');
const figures = require('figures');
const luxon = require('luxon');
const mongoose = require('mongoose');
const ora = require('ora');
const readlineAsync = require('readline-async');
const TwitterStreamChannels = require('twitter-stream-channels');

const mongoDB = require('./db/mongoDB');
const tweetSchema = require('./schemas/tweet');

const streamWatchList = require('./config/config.stream.json');

process.title = 'Node Twitter Stream';

//----------Init

const spinner = ora({ spinner: 'dots' });

const twitter = new TwitterStreamChannels({
  consumer_key: process.env.twitter_consumer_key,
  consumer_secret: process.env.twitter_consumer_secret,
  access_token: process.env.twitter_access_token,
  access_token_secret: process.env.twitter_access_token_secret,
});

let stream;

(async () => {
  await mongoDB.connect();

  // Start stream
  stream = twitter.streamChannels({ track: streamWatchList });

  console.log(chalk.magenta('Twitter stream opened.\n'));
  console.log(chalk('The following keywords will be watched:'));

  consoleListener();
  spinner.start();

  //loop throuhg track channels
  for (const ch in streamWatchList) {
    console.log(chalk.blue(ch));
    streamWatchList[ch].forEach((keyword) => console.log(chalk.green(`  ${keyword}`)));

    //Process each channel in separate listeners like these.
    stream.on(`channels/${ch}`, (tweet) => {
      spinner.stop();
      processTweet(tweet, ch);
    });
  }

  console.log(chalk.white('Type "exit" or "close" to stop.\n'));
})();

const processTweet = async (tweetData, channel) => {
  tweetData = fixAttributes(tweetData);

  const TweetModel = mongoose.model(`${channel}-tweet`, tweetSchema);
  const tweet = new TweetModel(tweetData);
  await tweet.save();

  logToConsole(tweet, channel);
  spinner.start();
};

//post-procesing to remove $ (to save at Mongo DB)
const fixAttributes = (tweet) => {
  tweet.created_at = new Date(tweet.created_at);
  tweet.user.created_at = new Date(tweet.user.created_at);

  tweet.keywords = tweet.$keywords;

  delete tweet.$keywords;
  delete tweet.$channels;

  return tweet;
};

const logToConsole = ({ entities }, channel) => {
  const now = luxon.DateTime.local();
  const hastags = entities.hashtags.map((tag) => tag.text);

  console.log(
    chalk.grey(`[${now.toLocaleString(luxon.DateTime.DATETIME_MED)}]`),
    chalk.keyword('orange')(channel),
    chalk.green(`${hastags.join(', ')}`),
    figures.tick
  );
};

// intereration with the console. Type 'close' or 'exit' to close the stream
const consoleListener = async () => {
  let close;
  while (!close) {
    const line = await readlineAsync();
    if (line == 'close' || line == 'exit') {
      closeStream();
      close = true;
    }
  }
};

const closeStream = () => {
  spinner.stop();
  stream.stop(); //closes the stream connected to Twitter
  mongoDB.close();
  console.log('Twitter stream closed');
};
