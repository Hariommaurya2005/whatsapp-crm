const mongoose = require('mongoose');
const User = require('../models/User');

// @desc    List all users (admin only) — name/email/role/status/createdAt.
//          Password is never returned (schema field has select: false).
// @route   GET /api/users
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('name email role isActive createdAt lastLogin').sort('-createdAt');
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Activate or deactivate a user (admin only). Never changes role.
// @route   PUT /api/users/:id/status
const updateUserStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive (boolean) is required' });
    }

    // Prevent an admin from locking themselves out.
    if (req.params.id === req.user._id.toString() && isActive === false) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // This endpoint only ever touches isActive — role is never accepted
    // here, so there is no path from this route to a role change.
    user.isActive = isActive;
    await user.save();

    const sanitized = await User.findById(user._id).select('name email role isActive createdAt lastLogin');
    res.json({ success: true, data: sanitized });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getUsers, updateUserStatus };
