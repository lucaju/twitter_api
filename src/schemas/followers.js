const mongoose = require('mongoose');

const followersSchema = mongoose.Schema({}, {
	strict: false
});

module.exports = followersSchema;