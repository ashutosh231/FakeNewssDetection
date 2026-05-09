const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient } = require('../config/redis');
const {
  signupUser,
  verifyOtp,
  loginUser,
  googleAuthUser,
  logoutUser,
  requestDeleteOtp,
  deleteAccount,
  getUserProfile,
  updateUserProfile,
  sendSupportQuery
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // simple local upload for now

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
    prefix: "rl:auth:",
  }),
  message: 'Too many authentication attempts, please try again later.'
});

router.post('/signup', authLimiter, signupUser);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/login', authLimiter, loginUser);
router.post('/google', authLimiter, googleAuthUser);
router.post('/logout', logoutUser);
router.route('/me')
  .get(protect, getUserProfile)
  .put(protect, upload.single('profileImage'), updateUserProfile);
router.post('/request-delete-otp', protect, requestDeleteOtp);
router.post('/delete-account', protect, deleteAccount);
router.post('/support', protect, sendSupportQuery);

module.exports = router;
