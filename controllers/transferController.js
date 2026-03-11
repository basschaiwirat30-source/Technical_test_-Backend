const Joi = require('joi');
const { Transfer, Wallet, Currency, User } = require('../models');
const { sequelize } = require('../models');

const internalTransferSchema = Joi.object({
  to_username: Joi.string().required(),
  currency_symbol: Joi.string().required(),
  amount: Joi.number().positive().required()
});

const externalTransferSchema = Joi.object({
  currency_symbol: Joi.string().required(),
  amount: Joi.number().positive().required(),
  external_address: Joi.string().required()
});

const createInternalTransfer = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { error } = internalTransferSchema.validate(req.body);
    if (error) {
      await t.rollback();
      return res.status(400).json({ error: error.details[0].message });
    }

    const { to_username, currency_symbol, amount } = req.body;

    // Find recipient
    const recipient = await User.findOne({
      where: { 
        username: to_username,
        is_active: true
      },
      transaction: t
    });

    if (!recipient) {
      await t.rollback();
      return res.status(404).json({ error: 'Recipient not found' });
    }

    if (recipient.id === req.user.id) {
      await t.rollback();
      return res.status(400).json({ error: 'Cannot transfer to yourself' });
    }

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

    // Find sender's wallet
    const senderWallet = await Wallet.findOne({
      where: {
        user_id: req.user.id,
        currency_id: currency.id
      },
      transaction: t
    });

    if (!senderWallet) {
      await t.rollback();
      return res.status(400).json({ error: 'You do not have a wallet for this currency' });
    }

    // Check balance
    if (parseFloat(senderWallet.balance) < parseFloat(amount)) {
      await t.rollback();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Find or create recipient's wallet
    let recipientWallet = await Wallet.findOne({
      where: {
        user_id: recipient.id,
        currency_id: currency.id
      },
      transaction: t
    });

    if (!recipientWallet) {
      recipientWallet = await Wallet.create({
        user_id: recipient.id,
        currency_id: currency.id,
        balance: 0,
        wallet_address: currency.type === 'crypto' ? require('uuid').v4() : null
      }, { transaction: t });
    }

    // Calculate fee
    const fee = currency.type === 'crypto' ? 0.0001 : 10; // Fixed fees
    const totalDeduction = parseFloat(amount) + fee;

    // Check if user has enough for fee
    if (parseFloat(senderWallet.balance) < totalDeduction) {
      await t.rollback();
      return res.status(400).json({ error: 'Insufficient balance for transfer amount and fee' });
    }

    // Create transfer record
    const transfer = await Transfer.create({
      from_user_id: req.user.id,
      to_user_id: recipient.id,
      currency_id: currency.id,
      amount,
      transfer_type: 'internal',
      fee,
      status: 'processing'
    }, { transaction: t });

    // Update balances
    await senderWallet.updateBalance(totalDeduction, 'subtract');
    await recipientWallet.updateBalance(amount, 'add');

    // Complete transfer
    await transfer.complete();

    await t.commit();

    // Get transfer with associations
    const transferWithAssociations = await Transfer.findByPk(transfer.id, {
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
      ]
    });

    res.status(201).json({
      message: 'Internal transfer completed successfully',
      transfer: transferWithAssociations
    });
  } catch (error) {
    await t.rollback();
    console.error('Internal transfer error:', error);
    res.status(500).json({ error: 'Failed to create internal transfer' });
  }
};

const createExternalTransfer = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { error } = externalTransferSchema.validate(req.body);
    if (error) {
      await t.rollback();
      return res.status(400).json({ error: error.details[0].message });
    }

    const { currency_symbol, amount, external_address } = req.body;

    // Find currency (must be crypto)
    const currency = await Currency.findOne({
      where: { 
        symbol: currency_symbol.toUpperCase(),
        type: 'crypto',
        is_active: true
      },
      transaction: t
    });

    if (!currency) {
      await t.rollback();
      return res.status(404).json({ error: 'Cryptocurrency not found or inactive' });
    }

    // Find user's wallet
    const userWallet = await Wallet.findOne({
      where: {
        user_id: req.user.id,
        currency_id: currency.id
      },
      transaction: t
    });

    if (!userWallet) {
      await t.rollback();
      return res.status(400).json({ error: 'You do not have a wallet for this cryptocurrency' });
    }

    // Check balance
    if (parseFloat(userWallet.balance) < parseFloat(amount)) {
      await t.rollback();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Calculate fee
    const fee = 0.0001; // Fixed crypto fee
    const totalDeduction = parseFloat(amount) + fee;

    // Check if user has enough for fee
    if (parseFloat(userWallet.balance) < totalDeduction) {
      await t.rollback();
      return res.status(400).json({ error: 'Insufficient balance for transfer amount and fee' });
    }

    // Create transfer record
    const transfer = await Transfer.create({
      from_user_id: req.user.id,
      currency_id: currency.id,
      amount,
      transfer_type: 'external',
      external_address,
      fee,
      status: 'processing'
    }, { transaction: t });

    // Update balance (deduct amount + fee)
    await userWallet.updateBalance(totalDeduction, 'subtract');

    await t.commit();

    // In a real implementation, you would integrate with blockchain here
    // For now, we'll simulate blockchain processing
    setTimeout(async () => {
      try {
        const txHash = `0x${require('crypto').randomBytes(32).toString('hex')}`;
        await transfer.complete(txHash);
        console.log(`External transfer ${transfer.id} completed with tx hash: ${txHash}`);
      } catch (error) {
        console.error('Failed to complete external transfer:', error);
        await transfer.fail();
      }
    }, 30000); // Simulate 30 second blockchain processing

    // Get transfer with associations
    const transferWithAssociations = await Transfer.findByPk(transfer.id, {
      include: [
        {
          association: 'fromUser',
          attributes: ['id', 'username']
        },
        {
          association: 'currency',
          attributes: ['symbol', 'name', 'type']
        }
      ]
    });

    res.status(201).json({
      message: 'External transfer initiated. Please wait for blockchain confirmation.',
      transfer: transferWithAssociations
    });
  } catch (error) {
    await t.rollback();
    console.error('External transfer error:', error);
    res.status(500).json({ error: 'Failed to create external transfer' });
  }
};

const getTransfers = async (req, res) => {
  try {
    const { transfer_type, status, page = 1, limit = 20 } = req.query;
    
    const whereClause = {
      [sequelize.Sequelize.Op.or]: [
        { from_user_id: req.user.id },
        { to_user_id: req.user.id }
      ]
    };
    
    if (transfer_type) {
      whereClause.transfer_type = transfer_type;
    }
    
    if (status) {
      whereClause.status = status;
    }

    const transfers = await Transfer.findAndCountAll({
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
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Add direction information
    const transfersWithDirection = transfers.rows.map(transfer => {
      const transferData = transfer.toJSON();
      transferData.direction = transfer.from_user_id === req.user.id ? 'sent' : 'received';
      return transferData;
    });

    res.json({
      transfers: transfersWithDirection,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: transfers.count,
        pages: Math.ceil(transfers.count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get transfers error:', error);
    res.status(500).json({ error: 'Failed to get transfers' });
  }
};

const getTransferById = async (req, res) => {
  try {
    const { transferId } = req.params;
    
    const transfer = await Transfer.findOne({
      where: {
        id: transferId,
        [sequelize.Sequelize.Op.or]: [
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
        }
      ]
    });

    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const transferData = transfer.toJSON();
    transferData.direction = transfer.from_user_id === req.user.id ? 'sent' : 'received';

    res.json({ transfer: transferData });
  } catch (error) {
    console.error('Get transfer error:', error);
    res.status(500).json({ error: 'Failed to get transfer' });
  }
};

module.exports = {
  createInternalTransfer,
  createExternalTransfer,
  getTransfers,
  getTransferById
};
