const express = require('express');
const router = express.Router();
const multer = require('multer');

const {
  scanText,
  getScanHistory
} = require('../controllers/scanController');
const {
  analyzeUploadedImage,
  getImageJobStatus,
  analyzeRemoteImage,
} = require('../controllers/imageScanController');
const { protect } = require('../middleware/authMiddleware');
const { checkUsageLimit } = require('../middleware/usageMiddleware');

// Local disk upload for image analysis (8 MB cap, images only)
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      return cb(new Error('Only image files are supported'));
    }
    cb(null, true);
  },
});

router.post('/text', protect, checkUsageLimit, scanText);
router.get('/history', protect, getScanHistory);

// DeepSeek-VL image OCR + contextual understanding (additive).
// Both /image and /image/url are public — they only perform OCR text
// extraction and contextual understanding, which doesn't consume a
// user's scan quota. The actual quota-consuming action remains
// POST /scan/text (which stays behind protect + checkUsageLimit).
// Global rate limiter on /api/ still applies to prevent abuse.
router.post('/image', upload.single('image'), analyzeUploadedImage);
router.post('/image/url', analyzeRemoteImage);
router.get('/image/:jobId', protect, getImageJobStatus);

module.exports = router;
