const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    first_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: [1, 50],
        notEmpty: true
      }
    },
    last_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: [1, 50],
        notEmpty: true
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: /^[+]?[0-9\s\-()]+$/
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    verification_status: {
      type: DataTypes.ENUM('unverified', 'pending', 'verified'),
      defaultValue: 'unverified'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: async (user) => {
        if (user.password_hash) {
          user.password_hash = await bcrypt.hash(user.password_hash, 12);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password_hash')) {
          user.password_hash = await bcrypt.hash(user.password_hash, 12);
        }
      }
    }
  });

  // Instance methods
  User.prototype.validatePassword = async function(password) {
    return await bcrypt.compare(password, this.password_hash);
  };

  User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password_hash;
    return values;
  };

  // Associations
  User.associate = function(models) {
    User.hasMany(models.Wallet, {
      foreignKey: 'user_id',
      as: 'wallets'
    });

    User.hasMany(models.Order, {
      foreignKey: 'user_id',
      as: 'orders'
    });

    User.hasMany(models.Transaction, {
      foreignKey: 'from_user_id',
      as: 'sentTransactions'
    });

    User.hasMany(models.Transaction, {
      foreignKey: 'to_user_id',
      as: 'receivedTransactions'
    });

    User.hasMany(models.Transfer, {
      foreignKey: 'from_user_id',
      as: 'sentTransfers'
    });

    User.hasMany(models.Transfer, {
      foreignKey: 'to_user_id',
      as: 'receivedTransfers'
    });

    User.hasMany(models.TradeHistory, {
      foreignKey: 'buyer_id',
      as: 'buyTrades'
    });

    User.hasMany(models.TradeHistory, {
      foreignKey: 'seller_id',
      as: 'sellTrades'
    });

    User.hasMany(models.PaymentMethod, {
      foreignKey: 'user_id',
      as: 'paymentMethods'
    });
  };

  return User;
};
