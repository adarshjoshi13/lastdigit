const sequelize = require('../config/database');
const User = require('./User');
const { SingaporeLottery, DearLottery } = require('./Lottery');

// Export all models and the sequelize instance
module.exports = {
  sequelize,
  User,
  SingaporeLottery,
  DearLottery,
};

