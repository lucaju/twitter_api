# Twitter API

A framework to collect Twitter data using the official Twitter API.

- [**Stream**](#Stream) of public tweets
- User’s [**followers**](#Followers)
  
## Dependencies

### Node.JS and NPM

Make sure you have the latest version of Node.js installed on your machine. You can download Node.js here: [NodeJS](https://nodejs.org/).
*Note: Node.js comes with NPM*

## Install

### Clone or Download this project

### Install project dependencies

- Open Terminal
- Navigate to the folder you saved this project.
- execute: `npm install`
- create a .env file to save your credentials
- Rename the folder _config-sample_ to _config_

### Twitter Credentials

To use this framework you need first to obtain a Twitter Developer Account: [https://developer.twitter.com/](https://developer.twitter.com/)

On your *.env* file add the following:

```env
twitter_consumer_key=your_consumer_key
twitter_consumer_secret=your_consumer_secret
twitter_access_token=your_access_token
twitter_access_token_secret=your_access_token_secret
```

## Stream

### Stream Dependencies

#### MongoDB

Tweets collected with the stream connector are directly saved into a MongoDB database.

Install and run locally: [https://www.mongodb.com/download-center/community](https://www.mongodb.com/download-center/community)
Or set up a remote server, like [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

As a way to manage MongoDB, I suggest using MongoDB Compass: [https://www.mongodb.com/download-center](https://www.mongodb.com/download-center)

#### MongoDB config

On your *.env* file add the following:

```env
useLocalDB=true
MONGODB_LOCAL_URL=mongodb://127.0.0.1:27017/your_database
MONGODB_REMOTE_URL=your_remote_server/your_database
```

##### Note: Change useLocalDB to "false" to use your remote server

### Define hashtags to follow

- Edit _config.stream.json:_
- Add a list of hashtags or keywords to track.
- Separate the hashtags into different channels (collections).

e.g.:

```json
{
    "channel1": [
        "#hastag1",
        "#hastag2",
        "any_keyworkd"
    ],
    "channel2": [
        "#hastag3"
    ]
}
```

*Note: Tweets from different channels are saved on separated collection in the database.*

### Run Stream

In the folder's project, run: `env-cmd node stream.js`

## Followers

### Define the users you want to get data from

Edit _config.followers.json_ with a list of usernames.

e.g.:

```json
    {
        "useJSON": true, [true|false]
        "useDB": false, [true|false]
        "users": [
            "username1",
            "username2"
        ]
    }
```

### Run Followers

In the folder's project, run: `node env-cmd node followers.js`

*Note: You can override the config file passing usernames directly.*

e.g.: `env-cmd node followers.js —-users=username1,username2`

### Results

`--useJSON=true|false` Save results to JSON file (default: true)
Results are saved in the folder *./results/followers*.

`--useDB=true|false` Save result to a MongoDB. Must setup first. Chech isntruction above.
