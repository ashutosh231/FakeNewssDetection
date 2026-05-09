const jwt = require('jsonwebtoken');

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: isProduction,                     // HTTPS only in production
    sameSite: isProduction ? 'none' : 'lax',  // 'none' required for cross-origin cookies
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });
};

module.exports = generateToken;

