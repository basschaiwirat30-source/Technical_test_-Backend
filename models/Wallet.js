const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Wallet = sequelize.define('Wallet', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      validate: {
        notEmpty: true
      }
    },
    currency_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'currencies',
        key: 'id'
      },
      validate: {
        notEmpty: true
      }
    },
    balance: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    wallet_address: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    }
  }, {
    tableName: 'wallets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: async (wallet) => {
        if (!wallet.wallet_address && wallet.currency.type === 'crypto') {
          wallet.wallet_address = uuidv4();
        }
      }
    },
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'currency_id']
      }
    ]
  });

  // Instance methods
  Wallet.prototype.updateBalance = async function(amount, operation = 'add') {
    const currentBalance = parseFloat(this.balance);
    
    if (operation === 'add') {
      this.balance = currentBalance + parseFloat(amount);
    } else if (operation === 'subtract') {
      if (currentBalance < parseFloat(amount)) {
        throw new Error('Insufficient balance');
      }
      this.balance = currentBalance - parseFloat(amount);
    }
    
    return await this.save();
  };

  // Class methods
  Wallet.findByUserAndCurrency = async function(userId, currencyId) {
    return await this.findOne({
      where: {
        user_id: userId,
        currency_id: currencyId
      },
      include: [{
        association: 'currency',
        attributes: ['symbol', 'name', 'type']
      }]
    });
  };

  // Associations
  Wallet.associate = function(models) {
    Wallet.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    Wallet.belongsTo(models.Currency, {
      foreignKey: 'currency_id',
      as: 'currency'
    });
  };

  return Wallet;
};
