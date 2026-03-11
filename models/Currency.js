module.exports = (sequelize, DataTypes) => {
  const Currency = sequelize.define('Currency', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    symbol: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      validate: {
        len: [1, 10],
        notEmpty: true,
        isUppercase: true
      }
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: [1, 50],
        notEmpty: true
      }
    },
    type: {
      type: DataTypes.ENUM('crypto', 'fiat'),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    current_price_usd: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    current_price_thb: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      }
    }
  }, {
    tableName: 'currencies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  // Associations
  Currency.associate = function(models) {
    Currency.hasMany(models.Wallet, {
      foreignKey: 'currency_id',
      as: 'wallets'
    });

    Currency.hasMany(models.Order, {
      foreignKey: 'currency_id',
      as: 'orders'
    });

    Currency.hasMany(models.Transaction, {
      foreignKey: 'currency_id',
      as: 'transactions'
    });

    Currency.hasMany(models.Transfer, {
      foreignKey: 'currency_id',
      as: 'transfers'
    });

    Currency.hasMany(models.TradeHistory, {
      foreignKey: 'currency_id',
      as: 'tradeHistories'
    });
  };

  return Currency;
};
