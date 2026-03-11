module.exports = (sequelize, DataTypes) => {
  const TradeHistory = sequelize.define('TradeHistory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    buyer_id: {
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
    seller_id: {
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
    total_value: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      validate: {
        min: 0.00000001,
        notEmpty: true
      }
    },
    trade_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    order_reference: {
      type: DataTypes.STRING(100),
      allowNull: true
    }
  }, {
    tableName: 'trade_histories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: (trade) => {
        // Calculate total value
        trade.total_value = parseFloat(trade.amount) * parseFloat(trade.price);
      },
      beforeUpdate: (trade) => {
        // Recalculate total value if amount or price changed
        if (trade.changed('amount') || trade.changed('price')) {
          trade.total_value = parseFloat(trade.amount) * parseFloat(trade.price);
        }
      }
    }
  });

  // Class methods
  TradeHistory.findByUser = async function(userId, options = {}) {
    const whereClause = {
      [sequelize.Sequelize.Op.or]: [
        { buyer_id: userId },
        { seller_id: userId }
      ]
    };
    
    return await this.findAll({
      where: whereClause,
      include: [
        {
          association: 'buyer',
          attributes: ['id', 'username']
        },
        {
          association: 'seller',
          attributes: ['id', 'username']
        },
        {
          association: 'currency',
          attributes: ['symbol', 'name', 'type']
        }
      ],
      order: [['trade_date', 'DESC']],
      ...options
    });
  };

  TradeHistory.getMarketStats = async function(currencyId, timeRange = '24h') {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    const stats = await this.findOne({
      where: {
        currency_id: currencyId,
        trade_date: {
          [sequelize.Sequelize.Op.gte]: startDate
        }
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'trade_count'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_volume'],
        [sequelize.fn('AVG', sequelize.col('price')), 'avg_price'],
        [sequelize.fn('MIN', sequelize.col('price')), 'min_price'],
        [sequelize.fn('MAX', sequelize.col('price')), 'max_price']
      ],
      raw: true
    });
    
    return stats;
  };

  // Associations
  TradeHistory.associate = function(models) {
    TradeHistory.belongsTo(models.User, {
      foreignKey: 'buyer_id',
      as: 'buyer'
    });

    TradeHistory.belongsTo(models.User, {
      foreignKey: 'seller_id',
      as: 'seller'
    });

    TradeHistory.belongsTo(models.Currency, {
      foreignKey: 'currency_id',
      as: 'currency'
    });
  };

  return TradeHistory;
};
