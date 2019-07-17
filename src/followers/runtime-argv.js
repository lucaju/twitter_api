const argv = require('argv');

const argvOptions = [
	{
		name: 'users',
		type: 'csv,string',
		description: 'Defines the usernames',
		example: '"script --users=value1,value2"'
	},
	{
		name: 'useJSON',
		short: 'f',
		type: 'boolean',
		description: 'Save to a file (Default: true)',
		example: '"script --useJSON=true" or "script -f false"'
	},
	{
		name: 'useDB',
		short: 'd',
		type: 'boolean',
		description: 'Save to mongoDB (must setup first - default: false)',
		example: '"script --useDB=true" or "script -d false"'
	}
];

const args = argv.option(argvOptions).run();
const runtimeArgv = args.options;

module.exports = {
	runtimeArgv
};