const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const ScanHistory = require('../models/ScanHistory');
const generateToken = require('../utils/generateToken');
const cloudinary = require('cloudinary').v2;
const { redisClient } = require('../config/redis');
const { sendWelcomeEmail, sendOtpEmail, sendDeleteOtpEmail, sendSupportQueryEmail } = require('../services/emailService');

// Configure cloudinary (optional if you have the keys in .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const signupUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  let user = await User.findOne({ email });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  if (user) {
    if (user.isVerified) {
      res.status(400);
      throw new Error('User already exists and is verified');
    }
    // Update existing unverified user
    user.name = name;
    user.password = password;
    await user.save();
  } else {
    // Create new unverified user
    user = await User.create({
      name,
      email,
      password,
      isVerified: false
    });
  }

  if (user) {
    await redisClient.setEx(`otp:verify:${email}`, 600, otp);
    try {
      await sendOtpEmail(user.email, user.name, otp);
    } catch (emailErr) {
      console.error('[SIGNUP] OTP email failed:', emailErr.message);
      res.status(500);
      throw new Error('Failed to send verification email. Please try again later.');
    }
    res.status(200).json({
      message: 'OTP sent successfully',
      requireOtp: true,
      email: user.email
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    res.status(400); throw new Error('User not found');
  }
  if (user.isVerified) {
    res.status(400); throw new Error('User is already verified');
  }
  
  const storedOtp = await redisClient.get(`otp:verify:${email}`);
  if (!storedOtp || storedOtp !== otp) {
    res.status(400); throw new Error('Invalid or expired OTP');
  }

  user.isVerified = true;
  await user.save();
  await redisClient.del(`otp:verify:${email}`);

  generateToken(res, user._id);
  sendWelcomeEmail(user.email, user.name);

  res.status(200).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    subscriptionPlan: user.subscriptionPlan
  });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    if (!user.isVerified) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await redisClient.setEx(`otp:verify:${user.email}`, 600, otp); // 10 minutes expiry
      try {
        await sendOtpEmail(user.email, user.name, otp);
      } catch (emailErr) {
        console.error('[LOGIN] OTP email failed:', emailErr.message);
        res.status(500);
        throw new Error('Failed to send verification email. Please try again later.');
      }
      
      res.status(403).json({
        message: 'Please verify your email. A new OTP has been sent.',
        requireOtp: true,
        email: user.email
      });
      return;
    }

    generateToken(res, user._id);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      subscriptionPlan: user.subscriptionPlan,
      freeScansUsed: user.freeScansUsed,
      totalScans: user.totalScans || 0,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      subscriptionExpiry: user.subscriptionExpiry
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

const googleAuthUser = asyncHandler(async (req, res) => {
  const { email, name, profileImage, googleId } = req.body;
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      password: Date.now().toString() + Math.random().toString(), // Random password since they login with Google
      profileImage: profileImage || '',
      isVerified: true
    });
    sendWelcomeEmail(user.email, user.name);
  } else if (!user.isVerified) {
    user.isVerified = true;
    if (profileImage && !user.profileImage) {
      user.profileImage = profileImage;
    }
    await user.save();
  }

  generateToken(res, user._id);
  res.status(200).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    subscriptionPlan: user.subscriptionPlan,
    freeScansUsed: user.freeScansUsed,
    totalScans: user.totalScans || 0,
    profileImage: user.profileImage,
    createdAt: user.createdAt,
    subscriptionExpiry: user.subscriptionExpiry
  });
});

const logoutUser = asyncHandler(async (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

const requestDeleteOtp = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redisClient.setEx(`otp:delete:${user._id}`, 600, otp);

  sendDeleteOtpEmail(user.email, user.name, otp);

  res.json({ message: 'OTP sent to email for account deletion' });
});

const deleteAccount = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const storedOtp = await redisClient.get(`otp:delete:${user._id}`);
  if (!storedOtp || storedOtp !== otp) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  await User.deleteOne({ _id: user._id });
  await redisClient.del(`otp:delete:${user._id}`);

  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });

  res.json({ message: 'Account deleted successfully' });
});

const getUserProfile = asyncHandler(async (req, res) => {
  const cachedProfile = await redisClient.get(`cache:user:${req.user._id}`);
  if (cachedProfile) {
    return res.json(JSON.parse(cachedProfile));
  }

  const user = await User.findById(req.user._id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Count actual scans from ScanHistory for accuracy
  const scanCount = await ScanHistory.countDocuments({ userId: req.user._id });

  const profileData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage,
    subscriptionPlan: user.subscriptionPlan,
    subscriptionActive: user.subscriptionActive,
    subscriptionExpiry: user.subscriptionExpiry,
    freeScansUsed: user.freeScansUsed,
    totalScans: scanCount,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  await redisClient.setEx(`cache:user:${req.user._id}`, 3600, JSON.stringify(profileData));
  res.json(profileData);
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const body = req.body || {};

  if (user) {
    user.name = body.name || user.name;
    user.email = body.email || user.email;

    if (body.password) {
      user.password = body.password;
    }

    // Handle image upload if a file was sent
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'truthscan_profiles'
        });
        user.profileImage = result.secure_url;
      } catch (err) {
        res.status(500);
        throw new Error('Image upload failed');
      }
    }

    const updatedUser = await user.save();
    await redisClient.del(`cache:user:${req.user._id}`);

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      profileImage: updatedUser.profileImage,
      subscriptionPlan: updatedUser.subscriptionPlan
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

const sendSupportQuery = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message) {
    res.status(400);
    throw new Error('Message is required');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await sendSupportQueryEmail(user.email, user.name, message);
  res.json({ message: 'Support query sent successfully!' });
});

module.exports = {
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
};
