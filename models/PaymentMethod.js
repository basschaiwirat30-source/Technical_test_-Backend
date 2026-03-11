module.exports = (sequelize, DataTypes) => {
  const PaymentMethod = sequelize.define('PaymentMethod', {
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
    method_type: {
      type: DataTypes.ENUM('bank_account', 'mobile_banking', 'credit_card', 'debit_card', 'ewallet'),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: [1, 50],
        notEmpty: true
      }
    },
    account_number: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    account_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
        notEmpty: true
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'payment_methods',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'account_number']
      }
    ]
  });

  // Class methods
  PaymentMethod.findByUser = async function(userId, options = {}) {
    return await this.findAll({
      where: {
        user_id: userId,
        is_active: true
      },
      order: [['created_at', 'DESC']],
      ...options
    });
  };

  // Associations
  PaymentMethod.associate = function(models) {
    PaymentMethod.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return PaymentMethod;
};
