const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// ─── Shared session ENUM values ───────────────────────────────────────────────
const SESSION_VALUES = ['morning', 'day', 'evening', 'night'];

// ─── Singapore Lottery Result ────────────────────────────────────────────────
const SingaporeLottery = sequelize.define(
  'SingaporeLottery',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    drawDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Date of the draw (YYYY-MM-DD)',
    },
    session: {
      type: DataTypes.ENUM(...SESSION_VALUES),
      allowNull: true,
      comment: 'Time slot: morning | day | evening | night',
    },
    drawNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Official draw / batch number',
    },
    // Full winning numbers, comma-separated e.g. "12,34,56,07,23,45"
    winningNumbers: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    firstPrize: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    secondPrize: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    thirdPrize: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    // Last-digit breakdown (the core feature of this app)
    lastOneDigit: {
      type: DataTypes.STRING(1),
      allowNull: true,
      comment: 'Last 1 digit of the winning number',
    },
    lastTwoDigits: {
      type: DataTypes.STRING(2),
      allowNull: true,
      comment: 'Last 2 digits of the winning number',
    },
    lastThreeDigits: {
      type: DataTypes.STRING(3),
      allowNull: true,
      comment: 'Last 3 digits of the winning number',
    },
    // Path / URL of the uploaded result image
    resultImage: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Stored filename under /uploads/singapore/',
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'singapore_lottery_results',
    timestamps: true,
  }
);

// ─── Dear Lottery Result ─────────────────────────────────────────────────────
const DearLottery = sequelize.define(
  'DearLottery',
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    drawDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    session: {
      type: DataTypes.ENUM(...SESSION_VALUES),
      allowNull: true,
      comment: 'Time slot: morning | day | evening | night',
    },
    lotteryName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      comment: 'e.g. Dear Morning, Dear Evening, Dear Night',
    },
    drawNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    firstPrize: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    secondPrize: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    thirdPrize: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    // Last-digit breakdown
    lastOneDigit: {
      type: DataTypes.STRING(1),
      allowNull: true,
      comment: 'Last 1 digit of the winning number',
    },
    lastTwoDigits: {
      type: DataTypes.STRING(2),
      allowNull: true,
      comment: 'Last 2 digits of the winning number',
    },
    lastThreeDigits: {
      type: DataTypes.STRING(3),
      allowNull: true,
      comment: 'Last 3 digits of the winning number',
    },
    // Extra prizes stored as JSON array: [{rank, ticketNumber, amount}]
    consolationPrizes: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // Path / URL of the uploaded result image
    resultImage: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Stored filename under /uploads/dear/',
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'dear_lottery_results',
    timestamps: true,
  }
);

module.exports = { SingaporeLottery, DearLottery, SESSION_VALUES };

