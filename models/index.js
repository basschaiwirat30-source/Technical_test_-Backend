const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  process.env.DB_NAME || dbConfig.database,
  process.env.DB_USER || dbConfig.username,
  process.env.DB_PASSWORD || dbConfig.password,
  {
    host: process.env.DB_HOST || dbConfig.host,
    port: process.env.DB_PORT || dbConfig.port,
    dialect: dbConfig.dialect,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const db = {};

// Import models
const User = require('./User')(sequelize, Sequelize.DataTypes);
const Wallet = require('./Wallet')(sequelize, Sequelize.DataTypes);
const Currency = require('./Currency')(sequelize, Sequelize.DataTypes);
const Order = require('./Order')(sequelize, Sequelize.DataTypes);
const Transaction = require('./Transaction')(sequelize, Sequelize.DataTypes);
const Transfer = require('./Transfer')(sequelize, Sequelize.DataTypes);
const TradeHistory = require('./TradeHistory')(sequelize, Sequelize.DataTypes);
const PaymentMethod = require('./PaymentMethod')(sequelize, Sequelize.DataTypes);

// Add models to db object
db.User = User;
db.Wallet = Wallet;
db.Currency = Currency;
db.Order = Order;
db.Transaction = Transaction;
db.Transfer = Transfer;
db.TradeHistory = TradeHistory;
db.PaymentMethod = PaymentMethod;

// Set up associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
