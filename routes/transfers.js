const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { 
  createInternalTransfer, 
  createExternalTransfer, 
  getTransfers, 
  getTransferById 
} = require('../controllers/transferController');

// All routes are protected
router.use(auth);

router.post('/internal', createInternalTransfer);
router.post('/external', createExternalTransfer);
router.get('/', getTransfers);
router.get('/:transferId', getTransferById);

module.exports = router;
