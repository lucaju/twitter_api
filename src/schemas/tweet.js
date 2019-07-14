const mongoose = require('mongoose');

const tweetSchema = mongoose.Schema({}, {
	strict: false
});

module.exports = tweetSchema;