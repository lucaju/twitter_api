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
- Rename the folder _config-sample_ to _config_

### Twitter Credentials

To use this framework you need first to obtain a Twitter Developer Account: [https://developer.twitter.com/](https://developer.twitter.com/)

- Rename the folder _credentials-sample_ to _credentials_
- Edit _twitter.credentials.json_ with your credentials from your Twitter Account

e.g.:

```json
{
    "consumer_key": "your_consumer_key",
    "consumer_secret": "your_consumer_secret",
    "access_token": "your_access_token",
    "access_token_secret": "your_access_token_secret"
}
```

## Stream

### Dependencies

#### MongoDB

Tweets collected with the stream connector are directly saved into a MongoDB database.

Install and run locally: [https://www.mongodb.com/download-center/community](https://www.mongodb.com/download-center/community)
Or set up a remote server, like [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

As a way to manage MongoDB, I suggest using MongoDB Compass: [https://www.mongodb.com/download-center](https://www.mongodb.com/download-center)

#### MongoDB config

Edit _mongo.config.json_

- Indicate if you are usually a local or remote server.
- Put the URI for the local and remote server
- Choose a name for the database

e.g.:

```json
{
    "useLocalDB": true,
    "localServer": "mongodb://127.0.0.1:27017",
    "remoteServer": "your_remote_server",
    "database": "your_collection"
}
```

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

### Run

In the folder's project, run: `node src/stream.js`

## Followers

### Define the users you want to get data from

Edit _config.followers.json_ with a list of usernames.

e.g.:

```json
    [
      "username1",
      "username2"
    ]
```

### Run

In the folder's project, run: `node src/followers.js`

*Note: You can override the config file passing usernames directly.*

e.g.: `node src/followers.js —users=username1,username2`

### Results

Results are saved in the folder *results*.
