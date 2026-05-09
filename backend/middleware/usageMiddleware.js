const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

const checkUsageLimit = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Check if premium subscription is active and not expired
  if (user.subscriptionPlan === 'premium' && user.subscriptionActive) {
    if (user.subscriptionExpiry && new Date() > user.subscriptionExpiry) {
      user.subscriptionActive = false;
      user.subscriptionPlan = 'free';
      await user.save();
    } else {
      return next(); // Premium user, allow
    }
  }

  // Free user limit check (limit = 2)
  if (user.freeScansUsed >= 2) {
    return res.status(403).json({
      success: false,
      subscriptionRequired: true,
      upgradePrice: 150,
      message: "Free limit exceeded. Upgrade to continue using TruthScan AI."
    });
  }

  next();
});

module.exports = { checkUsageLimit };
