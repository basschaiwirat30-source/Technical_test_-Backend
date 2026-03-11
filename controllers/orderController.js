const Joi = require('joi');
const { Order, Wallet, Currency, User, Transaction, TradeHistory } = require('../models');
const { sequelize } = require('../models');

const createOrderSchema = Joi.object({
  currency_symbol: Joi.string().required(),
  order_type: Joi.string().valid('buy', 'sell').required(),
  amount: Joi.number().positive().required(),
  price: Joi.number().positive().required(),
  payment_method: Joi.string().optional()
});

const createOrder = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { error } = createOrderSchema.validate(req.body);
    if (error) {
      await t.rollback();
      return res.status(400).json({ error: error.details[0].message });
    }

    const { currency_symbol, order_type, amount, price, payment_method } = req.body;

    // Find currency
    const currency = await Currency.findOne({
      where: { 
        symbol: currency_symbol.toUpperCase(),
        is_active: true
      },
      transaction: t
    });

    if (!currency) {
      await t.rollback();
      return res.status(404).json({ error: 'Currency not found or inactive' });
    }

    // Check if user has required wallet
    let userWallet;
    if (order_type === 'sell') {
      // For sell orders, user must have crypto wallet
      userWallet = await Wallet.findOne({
        where: {
          user_id: req.user.id,
          currency_id: currency.id
        },
        include: [{ association: 'currency' }],
        transaction: t
      });

      if (!userWallet) {
        await t.rollback();
        return res.status(400).json({ error: 'You need a wallet to sell this currency' });
      }

      // Check if user has sufficient balance
      if (parseFloat(userWallet.balance) < parseFloat(amount)) {
        await t.rollback();
        return res.status(400).json({ error: 'Insufficient balance' });
      }
    } else {
      // For buy orders, ensure user has THB/USD wallet
      const fiatCurrency = await Currency.findOne({
        where: { symbol: 'THB', is_active: true },
        transaction: t
      });

      const fiatWallet = await Wallet.findOne({
        where: {
          user_id: req.user.id,
          currency_id: fiatCurrency.id
        },
        transaction: t
      });

      if (!fiatWallet) {
        await t.rollback();
        return res.status(400).json({ error: 'You need a THB wallet to buy cryptocurrency' });
      }

      const totalCost = parseFloat(amount) * parseFloat(price);
      if (parseFloat(fiatWallet.balance) < totalCost) {
        await t.rollback();
        return res.status(400).json({ error: 'Insufficient THB balance' });
      }
    }

    // Create order
    const order = await Order.create({
      user_id: req.user.id,
      currency_id: currency.id,
      order_type,
      amount,
      price,
      total_value: parseFloat(amount) * parseFloat(price),
      payment_method
    }, { transaction: t });

    // If it's a sell order, lock the funds
    if (order_type === 'sell') {
      await userWallet.updateBalance(amount, 'subtract');
    }

    await t.commit();

    // Get order with associations
    const orderWithAssociations = await Order.findByPk(order.id, {
      include: [
        {
          association: 'user',
          attributes: ['id', 'username', 'verification_status']
        },
        {
          association: 'currency',
          attributes: ['symbol', 'name', 'type']
        }
      ]
    });

    res.status(201).json({
      message: 'Order created successfully',
      order: orderWithAssociations
    });

    // Try to match the order asynchronously
    matchOrder(order.id);

  } catch (error) {
    await t.rollback();
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

const getOrders = async (req, res) => {
  try {
    const { currency_symbol, order_type, status, page = 1, limit = 20 } = req.query;
    
    const whereClause = {};
    
    if (currency_symbol) {
      const currency = await Currency.findOne({ where: { symbol: currency_symbol.toUpperCase() } });
      if (currency) {
        whereClause.currency_id = currency.id;
      }
    }
    
    if (order_type) {
      whereClause.order_type = order_type;
    }
    
    if (status) {
      whereClause.status = status;
    }

    const orders = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          association: 'user',
          attributes: ['id', 'username', 'verification_status']
        },
        {
          association: 'currency',
          attributes: ['symbol', 'name', 'type']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      orders: orders.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: orders.count,
        pages: Math.ceil(orders.count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    const whereClause = { user_id: req.user.id };
    
    if (status) {
      whereClause.status = status;
    }

    const orders = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          association: 'currency',
          attributes: ['symbol', 'name', 'type']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      orders: orders.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: orders.count,
        pages: Math.ceil(orders.count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ error: 'Failed to get user orders' });
  }
};

const cancelOrder = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOne({
      where: {
        id: orderId,
        user_id: req.user.id,
        status: ['pending', 'partially_filled']
      },
      include: [{ association: 'currency' }],
      transaction: t
    });

    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: 'Order not found or cannot be cancelled' });
    }

    // If it's a sell order, return the locked funds
    if (order.order_type === 'sell') {
      const userWallet = await Wallet.findOne({
        where: {
          user_id: req.user.id,
          currency_id: order.currency_id
        },
        transaction: t
      });

      if (userWallet) {
        const remainingAmount = parseFloat(order.amount) - parseFloat(order.filled_amount);
        if (remainingAmount > 0) {
          await userWallet.updateBalance(remainingAmount, 'add');
        }
      }
    }

    order.status = 'cancelled';
    await order.save({ transaction: t });

    await t.commit();

    res.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    await t.rollback();
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
};

const getOrderBook = async (req, res) => {
  try {
    const { currency_symbol } = req.params;
    
    const currency = await Currency.findOne({ 
      where: { 
        symbol: currency_symbol.toUpperCase(),
        is_active: true
      }
    });

    if (!currency) {
      return res.status(404).json({ error: 'Currency not found or inactive' });
    }

    // Get buy orders (sorted by price descending)
    const buyOrders = await Order.findAll({
      where: {
        currency_id: currency.id,
        order_type: 'buy',
        status: ['pending', 'partially_filled']
      },
      include: [{
        association: 'user',
        attributes: ['id', 'username', 'verification_status']
      }],
      order: [['price', 'DESC'], ['created_at', 'ASC']],
      limit: 50
    });

    // Get sell orders (sorted by price ascending)
    const sellOrders = await Order.findAll({
      where: {
        currency_id: currency.id,
        order_type: 'sell',
        status: ['pending', 'partially_filled']
      },
      include: [{
        association: 'user',
        attributes: ['id', 'username', 'verification_status']
      }],
      order: [['price', 'ASC'], ['created_at', 'ASC']],
      limit: 50
    });

    res.json({
      currency: {
        symbol: currency.symbol,
        name: currency.name
      },
      buy_orders: buyOrders,
      sell_orders: sellOrders
    });
  } catch (error) {
    console.error('Get order book error:', error);
    res.status(500).json({ error: 'Failed to get order book' });
  }
};

// Order matching function (simplified)
const matchOrder = async (orderId) => {
  const t = await sequelize.transaction();
  
  try {
    const order = await Order.findByPk(orderId, {
      include: [{ association: 'currency' }],
      transaction: t
    });

    if (!order || order.status !== 'pending') {
      await t.rollback();
      return;
    }

    // Find matching orders
    const matchingOrders = await Order.findAll({
      where: {
        currency_id: order.currency_id,
        order_type: order.order_type === 'buy' ? 'sell' : 'buy',
        status: ['pending', 'partially_filled'],
        [sequelize.Sequelize.Op.and]: [
          order.order_type === 'buy' 
            ? { price: { [sequelize.Sequelize.Op.lte]: order.price } }
            : { price: { [sequelize.Sequelize.Op.gte]: order.price } }
        ]
      },
      order: order.order_type === 'buy' 
        ? [['price', 'ASC'], ['created_at', 'ASC']]
        : [['price', 'DESC'], ['created_at', 'ASC']],
      transaction: t
    });

    // Simple matching logic (would need more sophisticated implementation in production)
    for (const matchOrder of matchingOrders) {
      if (parseFloat(order.filled_amount) >= parseFloat(order.amount)) {
        break;
      }

      const remainingAmount = parseFloat(order.amount) - parseFloat(order.filled_amount);
      const matchRemainingAmount = parseFloat(matchOrder.amount) - parseFloat(matchOrder.filled_amount);
      const tradeAmount = Math.min(remainingAmount, matchRemainingAmount);
      const tradePrice = matchOrder.price; // Use maker's price

      // Create transaction
      await Transaction.create({
        order_id: order.id,
        from_user_id: order.order_type === 'sell' ? order.user_id : matchOrder.user_id,
        to_user_id: order.order_type === 'buy' ? order.user_id : matchOrder.user_id,
        currency_id: order.currency_id,
        amount: tradeAmount,
        price: tradePrice,
        transaction_type: order.order_type,
        status: 'completed'
      }, { transaction: t });

      // Create trade history
      await TradeHistory.create({
        buyer_id: order.order_type === 'buy' ? order.user_id : matchOrder.user_id,
        seller_id: order.order_type === 'sell' ? order.user_id : matchOrder.user_id,
        currency_id: order.currency_id,
        amount: tradeAmount,
        price: tradePrice
      }, { transaction: t });

      // Update filled amounts
      await order.updateFilledAmount(tradeAmount);
      await matchOrder.updateFilledAmount(tradeAmount);
    }

    await t.commit();
  } catch (error) {
    await t.rollback();
    console.error('Order matching error:', error);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getUserOrders,
  cancelOrder,
  getOrderBook
};
