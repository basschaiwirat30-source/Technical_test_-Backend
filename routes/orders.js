const express = require('express');
const router = express.Router();
const { auth, optionalAuth } = require('../middleware/auth');
const { 
  createOrder, 
  getOrders, 
  getUserOrders, 
  cancelOrder, 
  getOrderBook 
} = require('../controllers/orderController');

// Public routes (for viewing order book)
router.get('/book/:currency_symbol', optionalAuth, getOrderBook);
router.get('/', optionalAuth, getOrders);

// Protected routes
router.use(auth);
router.post('/', createOrder);
router.get('/user', getUserOrders);
router.put('/:orderId/cancel', cancelOrder);

module.exports = router;
