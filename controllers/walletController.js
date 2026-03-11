const Joi = require('joi');
const { Wallet, Currency, User } = require('../models');
const { sequelize } = require('../models');

const getWallets = async (req, res) => {
  try {
    const wallets = await Wallet.findAll({
      where: { user_id: req.user.id },
      include: [{
        association: 'currency',
        attributes: ['symbol', 'name', 'type', 'current_price_usd', 'current_price_thb']
      }],
      order: [['created_at', 'ASC']]
    });

    // Calculate total portfolio value in USD and THB
    let totalUSD = 0;
    let totalTHB = 0;
    
    wallets.forEach(wallet => {
      if (wallet.currency.type === 'fiat') {
        if (wallet.currency.symbol === 'USD') {
          totalUSD += parseFloat(wallet.balance);
        } else if (wallet.currency.symbol === 'THB') {
          totalTHB += parseFloat(wallet.balance);
        }
      } else {
        // Convert crypto to fiat values
        totalUSD += parseFloat(wallet.balance) * parseFloat(wallet.currency.current_price_usd || 0);
        totalTHB += parseFloat(wallet.balance) * parseFloat(wallet.currency.current_price_thb || 0);
      }
    });

    res.json({
      wallets,
      portfolio_value: {
        usd: totalUSD,
        thb: totalTHB
      }
    });
  } catch (error) {
    console.error('Get wallets error:', error);
    res.status(500).json({ error: 'Failed to get wallets' });
  }
};

const getWalletByCurrency = async (req, res) => {
  try {
    const { currencySymbol } = req.params;
    
    const currency = await Currency.findOne({ where: { symbol: currencySymbol.toUpperCase() } });
    if (!currency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    const wallet = await Wallet.findOne({
      where: { 
        user_id: req.user.id,
        currency_id: currency.id
      },
      include: [{
        association: 'currency',
        attributes: ['symbol', 'name', 'type', 'current_price_usd', 'current_price_thb']
      }]
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found for this currency' });
    }

    res.json({ wallet });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: 'Failed to get wallet' });
  }
};

const createWallet = async (req, res) => {
  try {
    const { currencySymbol } = req.body;
    
    if (!currencySymbol) {
      return res.status(400).json({ error: 'Currency symbol is required' });
    }

    const currency = await Currency.findOne({ 
      where: { 
        symbol: currencySymbol.toUpperCase(),
        is_active: true
      }
    });
    
    if (!currency) {
      return res.status(404).json({ error: 'Currency not found or inactive' });
    }

    // Check if wallet already exists
    const existingWallet = await Wallet.findOne({
      where: {
        user_id: req.user.id,
        currency_id: currency.id
      }
    });

    if (existingWallet) {
      return res.status(400).json({ error: 'Wallet for this currency already exists' });
    }

    const wallet = await Wallet.create({
      user_id: req.user.id,
      currency_id: currency.id,
      balance: 0,
      wallet_address: currency.type === 'crypto' ? require('uuid').v4() : null
    });

    const walletWithCurrency = await Wallet.findByPk(wallet.id, {
      include: [{
        association: 'currency',
        attributes: ['symbol', 'name', 'type']
      }]
    });

    res.status(201).json({
      message: 'Wallet created successfully',
      wallet: walletWithCurrency
    });
  } catch (error) {
    console.error('Create wallet error:', error);
    res.status(500).json({ error: 'Failed to create wallet' });
  }
};

const getPortfolioSummary = async (req, res) => {
  try {
    const wallets = await Wallet.findAll({
      where: { user_id: req.user.id },
      include: [{
        association: 'currency',
        attributes: ['symbol', 'name', 'type', 'current_price_usd', 'current_price_thb']
      }]
    });

    const portfolio = {
      total_value_usd: 0,
      total_value_thb: 0,
      currencies: []
    };

    wallets.forEach(wallet => {
      const balance = parseFloat(wallet.balance);
      let valueUSD = 0;
      let valueTHB = 0;

      if (wallet.currency.type === 'fiat') {
        if (wallet.currency.symbol === 'USD') {
          valueUSD = balance;
          valueTHB = balance * 35; // Assuming 1 USD = 35 THB
        } else if (wallet.currency.symbol === 'THB') {
          valueTHB = balance;
          valueUSD = balance / 35; // Assuming 1 THB = 1/35 USD
        }
      } else {
        valueUSD = balance * parseFloat(wallet.currency.current_price_usd || 0);
        valueTHB = balance * parseFloat(wallet.currency.current_price_thb || 0);
      }

      portfolio.total_value_usd += valueUSD;
      portfolio.total_value_thb += valueTHB;

      portfolio.currencies.push({
        symbol: wallet.currency.symbol,
        name: wallet.currency.name,
        type: wallet.currency.type,
        balance: balance,
        value_usd: valueUSD,
        value_thb: valueTHB,
        percentage: 0 // Will be calculated below
      });
    });

    // Calculate percentages
    portfolio.currencies.forEach(currency => {
      currency.percentage = portfolio.total_value_usd > 0 
        ? (currency.value_usd / portfolio.total_value_usd) * 100 
        : 0;
    });

    // Sort by value (descending)
    portfolio.currencies.sort((a, b) => b.value_usd - a.value_usd);

    res.json({ portfolio });
  } catch (error) {
    console.error('Get portfolio summary error:', error);
    res.status(500).json({ error: 'Failed to get portfolio summary' });
  }
};

module.exports = {
  getWallets,
  getWalletByCurrency,
  createWallet,
  getPortfolioSummary
};
