const { Transaction, Order, User, Currency, TradeHistory } = require('../models');

const getTransactions = async (req, res) => {
  try {
    const { transaction_type, status, currency_symbol, page = 1, limit = 20 } = req.query;
    
    const whereClause = {
      [Transaction.sequelize.Sequelize.Op.or]: [
        { from_user_id: req.user.id },
        { to_user_id: req.user.id }
      ]
    };
    
    if (transaction_type) {
      whereClause.transaction_type = transaction_type;
    }
    
    if (status) {
      whereClause.status = status;
    }

    const includeOptions = [
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
    ];

    // Filter by currency if specified
    if (currency_symbol) {
      const currency = await Currency.findOne({ where: { symbol: currency_symbol.toUpperCase() } });
      if (currency) {
        whereClause.currency_id = currency.id;
      }
    }

    const transactions = await Transaction.findAndCountAll({
      where: whereClause,
      include: includeOptions,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Add direction information
    const transactionsWithDirection = transactions.rows.map(transaction => {
      const transactionData = transaction.toJSON();
      transactionData.direction = transaction.from_user_id === req.user.id ? 'sent' : 'received';
      return transactionData;
    });

    res.json({
      transactions: transactionsWithDirection,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: transactions.count,
        pages: Math.ceil(transactions.count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    const transaction = await Transaction.findOne({
      where: {
        id: transactionId,
        [Transaction.sequelize.Sequelize.Op.or]: [
          { from_user_id: req.user.id },
          { to_user_id: req.user.id }
        ]
      },
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
          attributes: ['id', 'order_type', 'amount', 'price']
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transactionData = transaction.toJSON();
    transactionData.direction = transaction.from_user_id === req.user.id ? 'sent' : 'received';

    res.json({ transaction: transactionData });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Failed to get transaction' });
  }
};

const getTradeHistory = async (req, res) => {
  try {
    const { currency_symbol, time_range = '24h', page = 1, limit = 20 } = req.query;
    
    const whereClause = {
      [TradeHistory.sequelize.Sequelize.Op.or]: [
        { buyer_id: req.user.id },
        { seller_id: req.user.id }
      ]
    };

    // Filter by currency if specified
    if (currency_symbol) {
      const currency = await Currency.findOne({ where: { symbol: currency_symbol.toUpperCase() } });
      if (currency) {
        whereClause.currency_id = currency.id;
      }
    }

    // Filter by time range
    if (time_range) {
      const now = new Date();
      let startDate;
      
      switch (time_range) {
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
      
      whereClause.trade_date = {
        [TradeHistory.sequelize.Sequelize.Op.gte]: startDate
      };
    }

    const trades = await TradeHistory.findAndCountAll({
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
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Add role information
    const tradesWithRole = trades.rows.map(trade => {
      const tradeData = trade.toJSON();
      tradeData.role = trade.buyer_id === req.user.id ? 'buyer' : 'seller';
      return tradeData;
    });

    res.json({
      trades: tradesWithRole,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: trades.count,
        pages: Math.ceil(trades.count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get trade history error:', error);
    res.status(500).json({ error: 'Failed to get trade history' });
  }
};

const getMarketStats = async (req, res) => {
  try {
    const { currency_symbol, time_range = '24h' } = req.query;
    
    let currencyId = null;
    if (currency_symbol) {
      const currency = await Currency.findOne({ 
        where: { 
          symbol: currency_symbol.toUpperCase(),
          is_active: true
        } 
      });
      if (currency) {
        currencyId = currency.id;
      }
    }

    const stats = await TradeHistory.getMarketStats(currencyId, time_range);
    
    // Parse the results
    const parsedStats = {
      trade_count: parseInt(stats.trade_count) || 0,
      total_volume: parseFloat(stats.total_volume) || 0,
      avg_price: parseFloat(stats.avg_price) || 0,
      min_price: parseFloat(stats.min_price) || 0,
      max_price: parseFloat(stats.max_price) || 0
    };

    res.json({ 
      time_range,
      currency: currency_symbol || 'all',
      stats: parsedStats
    });
  } catch (error) {
    console.error('Get market stats error:', error);
    res.status(500).json({ error: 'Failed to get market stats' });
  }
};

const getUserTradingStats = async (req, res) => {
  try {
    const { time_range = '30d' } = req.query;
    
    const now = new Date();
    let startDate;
    
    switch (time_range) {
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
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const stats = await TradeHistory.findAll({
      where: {
        [TradeHistory.sequelize.Sequelize.Op.or]: [
          { buyer_id: req.user.id },
          { seller_id: req.user.id }
        ],
        trade_date: {
          [TradeHistory.sequelize.Sequelize.Op.gte]: startDate
        }
      },
      attributes: [
        [TradeHistory.sequelize.Sequelize.fn('COUNT', TradeHistory.sequelize.Sequelize.col('id')), 'total_trades'],
        [TradeHistory.sequelize.Sequelize.fn('SUM', TradeHistory.sequelize.Sequelize.col('total_value')), 'total_volume'],
        [TradeHistory.sequelize.Sequelize.fn('AVG', TradeHistory.sequelize.Sequelize.col('price')), 'avg_price'],
        [TradeHistory.sequelize.Sequelize.fn('SUM', 
          TradeHistory.sequelize.Sequelize.literal('CASE WHEN buyer_id = ' + req.user.id + ' THEN total_value ELSE 0 END')
        ), 'total_bought'],
        [TradeHistory.sequelize.Sequelize.fn('SUM', 
          TradeHistory.sequelize.Sequelize.literal('CASE WHEN seller_id = ' + req.user.id + ' THEN total_value ELSE 0 END')
        ), 'total_sold']
      ],
      raw: true
    });

    const userStats = stats[0] || {};
    
    res.json({
      time_range,
      stats: {
        total_trades: parseInt(userStats.total_trades) || 0,
        total_volume: parseFloat(userStats.total_volume) || 0,
        avg_price: parseFloat(userStats.avg_price) || 0,
        total_bought: parseFloat(userStats.total_bought) || 0,
        total_sold: parseFloat(userStats.total_sold) || 0
      }
    });
  } catch (error) {
    console.error('Get user trading stats error:', error);
    res.status(500).json({ error: 'Failed to get user trading stats' });
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  getTradeHistory,
  getMarketStats,
  getUserTradingStats
};
