const chalk = require('chalk');
const express = require('express');

//Express server
const app = express()
app.use('/dataset', express.static(__dirname + '/dataset'));
const port = 3000;
let server = app.listen(port, () => console.log(chalk.cyan(`Initiate Server on on port ${port}!`)));