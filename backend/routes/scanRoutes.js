const express = require('express');
const router = express.Router();
const {
  scanText,
  getScanHistory
} = require('../controllers/scanController');
const { protect } = require('../middleware/authMiddleware');
const { checkUsageLimit } = require('../middleware/usageMiddleware');

router.post('/text', protect, checkUsageLimit, scanText);
router.get('/history', protect, getScanHistory);

module.exports = router;
