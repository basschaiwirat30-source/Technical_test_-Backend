module.exports = (sequelize, DataTypes) => {
  const Transfer = sequelize.define('Transfer', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
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
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
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
    transfer_type: {
      type: DataTypes.ENUM('internal', 'external'),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
      defaultValue: 'pending'
    },
    external_address: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        is: {
          args: /^[a-zA-Z0-9]+$/,
          msg: 'Invalid external address format'
        }
      }
    },
    blockchain_tx_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    fee: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'transfers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: (transfer) => {
        // Validate external transfer requirements
        if (transfer.transfer_type === 'external' && !transfer.external_address) {
          throw new Error('External address is required for external transfers');
        }
        
        // Validate internal transfer requirements
        if (transfer.transfer_type === 'internal' && !transfer.to_user_id) {
          throw new Error('Recipient user ID is required for internal transfers');
        }
        
        // Calculate fee (0.0001 BTC equivalent for crypto, fixed for fiat)
        if (transfer.fee === 0) {
          if (transfer.currency.type === 'crypto') {
            transfer.fee = 0.0001; // Fixed crypto fee
          } else {
            transfer.fee = 10; // Fixed fiat fee
          }
        }
      }
    }
  });

  // Instance methods
  Transfer.prototype.complete = async function(txHash = null) {
    this.status = 'completed';
    this.completed_at = new Date();
    if (txHash) {
      this.blockchain_tx_hash = txHash;
    }
    return await this.save();
  };

  Transfer.prototype.fail = async function(reason = 'Transfer failed') {
    this.status = 'failed';
    return await this.save();
  };

  // Class methods
  Transfer.findByUser = async function(userId, options = {}) {
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
        }
      ],
      order: [['created_at', 'DESC']],
      ...options
    });
  };

  // Associations
  Transfer.associate = function(models) {
    Transfer.belongsTo(models.User, {
      foreignKey: 'from_user_id',
      as: 'fromUser'
    });

    Transfer.belongsTo(models.User, {
      foreignKey: 'to_user_id',
      as: 'toUser'
    });

    Transfer.belongsTo(models.Currency, {
      foreignKey: 'currency_id',
      as: 'currency'
    });
  };

  return Transfer;
};
