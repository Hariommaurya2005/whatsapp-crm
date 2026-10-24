const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('+isActive +passwordChangedAt');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated' });
    }

    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({ success: false, message: 'Password changed recently. Please log in again' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired, please log in again' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role === 'admin') {
    return next();
  }
  res.status(403).json({ success: false, message: 'Admin access required' });
};

// Rate limiting by user (simple in-memory, use redis in prod)
const requestCounts = new Map();
const rateLimitMiddleware = (maxRequests = 100, windowMs = 60000) => (req, res, next) => {
  const key = req.user?._id?.toString() || req.ip;
  const now = Date.now();
  const userRequests = requestCounts.get(key) || { count: 0, resetTime: now + windowMs };

  if (now > userRequests.resetTime) {
    userRequests.count = 1;
    userRequests.resetTime = now + windowMs;
  } else {
    userRequests.count++;
  }

  requestCounts.set(key, userRequests);

  if (userRequests.count > maxRequests) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please slow down.',
      retryAfter: Math.ceil((userRequests.resetTime - now) / 1000),
    });
  }

  next();
};

module.exports = { protect, adminOnly, rateLimitMiddleware };
