module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    order_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id'
      },
      validate: {
        notEmpty: true
      }
    },
    from_user_id: {
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
    to_user_id: {
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
    amount: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      validate: {
        min: 0.00000001,
        notEmpty: true
      }
    },
    price: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      validate: {
        min: 0.00000001,
        notEmpty: true
      }
    },
    fee: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    transaction_type: {
      type: DataTypes.ENUM('buy', 'sell'),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
      defaultValue: 'pending'
    },
    blockchain_tx_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: (transaction) => {
        // Calculate fee (0.1% by default)
        if (transaction.fee === 0) {
          transaction.fee = parseFloat(transaction.amount) * parseFloat(transaction.price) * 0.001;
        }
      }
    }
  });

  // Instance methods
  Transaction.prototype.complete = async function() {
    this.status = 'completed';
    this.completed_at = new Date();
    return await this.save();
  };

  Transaction.prototype.fail = async function(reason = 'Transaction failed') {
    this.status = 'failed';
    return await this.save();
  };

  // Class methods
  Transaction.findByUser = async function(userId, options = {}) {
    const whereClause = {
      [sequelize.Sequelize.Op.or]: [
        { from_user_id: userId },
        { to_user_id: userId }
      ]
    };
    
    return await this.findAll({
      where: whereClause,
      include: [
        {
          association: 'fromUser',
          attributes: ['id', 'username']
        },
        {
          association: 'toUser',
          attributes: ['id', 'username']
        },
        {
          association: 'currency',
          attributes: ['symbol', 'name', 'type']
        },
        {
          association: 'order',
          attributes: ['id', 'order_type']
        }
      ],
      order: [['created_at', 'DESC']],
      ...options
    });
  };

  // Associations
  Transaction.associate = function(models) {
    Transaction.belongsTo(models.Order, {
      foreignKey: 'order_id',
      as: 'order'
    });

    Transaction.belongsTo(models.User, {
      foreignKey: 'from_user_id',
      as: 'fromUser'
    });

    Transaction.belongsTo(models.User, {
      foreignKey: 'to_user_id',
      as: 'toUser'
    });

    Transaction.belongsTo(models.Currency, {
      foreignKey: 'currency_id',
      as: 'currency'
    });
  };

  return Transaction;
};
