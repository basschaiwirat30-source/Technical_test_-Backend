const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { 
  getTransactions, 
  getTransactionById, 
  getTradeHistory, 
  getMarketStats, 
  getUserTradingStats 
} = require('../controllers/transactionController');

// All routes are protected
router.use(auth);

router.get('/', getTransactions);
router.get('/history', getTradeHistory);
router.get('/stats/market', getMarketStats);
router.get('/stats/user', getUserTradingStats);
router.get('/:transactionId', getTransactionById);

module.exports = router;
