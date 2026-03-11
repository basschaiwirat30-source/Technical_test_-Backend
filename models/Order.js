module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
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
    order_type: {
      type: DataTypes.ENUM('buy', 'sell'),
      allowNull: false,
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
    status: {
      type: DataTypes.ENUM('pending', 'partially_filled', 'filled', 'cancelled', 'expired'),
      defaultValue: 'pending'
    },
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    filled_amount: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    }
  }, {
    tableName: 'orders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: (order) => {
        // Set expiration time (default 24 hours)
        if (!order.expires_at) {
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);
          order.expires_at = expiresAt;
        }
        
        // Calculate total value
        order.total_value = parseFloat(order.amount) * parseFloat(order.price);
      },
      beforeUpdate: (order) => {
        // Recalculate total value if amount or price changed
        if (order.changed('amount') || order.changed('price')) {
          order.total_value = parseFloat(order.amount) * parseFloat(order.price);
        }
      }
    }
  });

  // Instance methods
  Order.prototype.updateFilledAmount = async function(amount) {
    this.filled_amount = parseFloat(this.filled_amount) + parseFloat(amount);
    
    // Update status based on filled amount
    if (this.filled_amount >= this.amount) {
      this.status = 'filled';
    } else if (this.filled_amount > 0) {
      this.status = 'partially_filled';
    }
    
    return await this.save();
  };

  Order.prototype.isExpired = function() {
    return new Date() > new Date(this.expires_at);
  };

  // Class methods
  Order.findActiveOrders = async function(currencyId, orderType = null) {
    const whereClause = {
      status: ['pending', 'partially_filled'],
      currency_id: currencyId
    };
    
    if (orderType) {
      whereClause.order_type = orderType;
    }
    
    return await this.findAll({
      where: whereClause,
      include: [{
        association: 'user',
        attributes: ['id', 'username', 'verification_status']
      }, {
        association: 'currency',
        attributes: ['symbol', 'name', 'type']
      }],
      order: [['price', orderType === 'buy' ? 'DESC' : 'ASC'], ['created_at', 'ASC']]
    });
  };

  // Associations
  Order.associate = function(models) {
    Order.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    Order.belongsTo(models.Currency, {
      foreignKey: 'currency_id',
      as: 'currency'
    });

    Order.hasMany(models.Transaction, {
      foreignKey: 'order_id',
      as: 'transactions'
    });
  };

  return Order;
};
