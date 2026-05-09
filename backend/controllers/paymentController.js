const asyncHandler = require('../utils/asyncHandler');
const razorpay = require('../utils/razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { redisClient } = require('../config/redis');
const { sendPaymentConfirmation } = require('../services/emailService');

const createOrder = asyncHandler(async (req, res) => {
  const options = {
    amount: 150 * 100, // ₹150 in paise
    currency: "INR",
    receipt: `rcpt_${req.user._id.toString().substring(0, 8)}_${Date.now()}`
  };

  try {
    const order = await razorpay.orders.create(options);
    res.status(200).json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("Razorpay Create Order Error:", error);
    res.status(500);
    throw new Error('Failed to create Razorpay order: ' + (error.description || error.message || 'Unknown Error'));
  }
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;

  if (isAuthentic) {
    const user = await User.findById(req.user._id);

    // Create Subscription Record
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30 days from now

    await Subscription.create({
      userId: user._id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      amount: 150,
      endDate
    });

    // Update user status
    user.subscriptionActive = true;
    user.subscriptionPlan = 'premium';
    user.subscriptionExpiry = endDate;
    user.freeScansUsed = 0; // Reset just in case they downgrade later
    await user.save();

    await redisClient.del(`cache:user:${user._id}`);

    res.status(200).json({
      success: true,
      message: 'Payment verified and Premium Subscription Activated!'
    });

    // Send payment confirmation email (non-blocking)
    sendPaymentConfirmation(user.email, user.name);
  } else {
    res.status(400);
    throw new Error('Payment verification failed');
  }
});

module.exports = {
  createOrder,
  verifyPayment
};
