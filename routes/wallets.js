const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { 
  getWallets, 
  getWalletByCurrency, 
  createWallet, 
  getPortfolioSummary 
} = require('../controllers/walletController');

// All routes are protected
router.use(auth);

router.get('/', getWallets);
router.get('/portfolio', getPortfolioSummary);
router.get('/:currencySymbol', getWalletByCurrency);
router.post('/', createWallet);

module.exports = router;
