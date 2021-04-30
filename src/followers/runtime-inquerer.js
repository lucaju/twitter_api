const chalk = require('chalk');
const inquirer = require('inquirer');

const runtimeInquerer = async () => {
  const result = await inquirer.prompt([
    {
      type: 'input',
      name: 'users',
      message: `Users' screenname from who you want get a list of followers: \n${chalk.gray(
        '(separate users by comma[,])'
      )}\n`,
      validate: function (input) {
        if (input !== '') return true;
        if (input === '') return chalk.red('You must list at least one user!');
      },
    },
    {
      type: 'list',
      name: 'useJSON',
      message: `Save results to a JSON file? ${chalk.gray('(Default: Yes)')} `,
      choices: [
        { name: 'YES', value: true },
        { name: 'No', value: false },
      ],
    },
    {
      type: 'list',
      name: 'useDB',
      message: `Save results to MongoDB? ${chalk.gray(
        '(Must be setup first. Check readme file. Default: No)'
      )}`,
      choices: [
        { name: 'NO', value: false },
        { name: 'Yes', value: true },
      ],
    },
  ]);

  return result;
};

module.exports = runtimeInquerer;
