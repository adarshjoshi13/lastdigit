const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Exactly 3 games per day for each digit: morning, day, evening
const SESSIONS = ['morning', 'day', 'evening'];

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
      type: DataTypes.ENUM(...SESSIONS),
      allowNull: false,
      comment: 'Game time: morning | day | evening',
    },
    singleDigit: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Winning number for single digit (1 digit, e.g. 7)',
    },
    doubleDigit: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Winning number for double digit (2 digits, e.g. 27)',
    },
    tripleDigit: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Winning number for triple digit (3 digits, e.g. 827)',
    },
    resultImage: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Uploaded result image filename under /uploads/singapore/',
    },
    drawNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Optional draw batch or reference number',
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'singapore_lottery_results',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['drawDate', 'session'],
        name: 'idx_singapore_date_session',
      },
    ],
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
      comment: 'Date of the draw (YYYY-MM-DD)',
    },
    session: {
      type: DataTypes.ENUM(...SESSIONS),
      allowNull: false,
      comment: 'Game time: morning | day | evening',
    },
    singleDigit: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Winning number for single digit (1 digit, e.g. 4)',
    },
    doubleDigit: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Winning number for double digit (2 digits, e.g. 94)',
    },
    tripleDigit: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Winning number for triple digit (3 digits, e.g. 194)',
    },
    resultImage: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Uploaded result image filename under /uploads/dear/',
    },
    drawNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Optional draw batch or reference number',
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'dear_lottery_results',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['drawDate', 'session'],
        name: 'idx_dear_date_session',
      },
    ],
  }
);

module.exports = { SingaporeLottery, DearLottery, SESSIONS };
