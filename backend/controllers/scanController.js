const asyncHandler = require('../utils/asyncHandler');
const ScanHistory = require('../models/ScanHistory');
const User = require('../models/User');
const { redisClient } = require('../config/redis');

const scanText = asyncHandler(async (req, res) => {
  const { content, inputType, credibilityScore, riskLevel, verdict, flags } = req.body;

  if (!content) {
    res.status(400);
    throw new Error('Content to scan is required');
  }

  // Find user to update scan count
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Log the scan history
  const history = await ScanHistory.create({
    userId: req.user._id,
    inputType: inputType || 'text',
    content,
    credibilityScore: credibilityScore || 50,
    riskLevel: riskLevel || 'Medium',
    verdict: verdict || 'Unverified',
    flags: flags || []
  });

  // Increment usage for free users
  if (user.subscriptionPlan === 'free') {
    user.freeScansUsed += 1;
    await user.save();
  }

  // Invalidate scan history cache and user cache (since freeScansUsed changed)
  await redisClient.del(`cache:scans:${req.user._id}`);
  await redisClient.del(`cache:user:${req.user._id}`);

  res.status(201).json({
    success: true,
    data: history,
    remainingFreeScans: user.subscriptionPlan === 'free' ? Math.max(0, 2 - user.freeScansUsed) : 'Unlimited'
  });
});

const getScanHistory = asyncHandler(async (req, res) => {
  const cachedScans = await redisClient.get(`cache:scans:${req.user._id}`);
  if (cachedScans) {
    return res.json(JSON.parse(cachedScans));
  }

  const history = await ScanHistory.find({ userId: req.user._id }).sort({ createdAt: -1 });
  await redisClient.setEx(`cache:scans:${req.user._id}`, 3600, JSON.stringify(history));
  
  res.json(history);
});

module.exports = {
  scanText,
  getScanHistory
};
