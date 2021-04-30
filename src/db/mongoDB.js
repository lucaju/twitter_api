const chalk = require('chalk');
const mongoose = require('mongoose');

const connect = async () => {
  await mongoose
    .connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    })
    .catch((err) => {
      console.log(chalk.red(err.name));
      return false;
    });

  return true;
};

const close = () => mongoose.connection.close();

module.exports = {
  connect,
  close,
};
