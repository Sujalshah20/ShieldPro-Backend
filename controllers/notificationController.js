const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');

// @desc    Get all notifications for logged-in user
// @route   GET /api/notifications
// @access  Private
const getMyNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50);
    res.json(notifications);
});

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
    res.json({ count });
});

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);
    if (!notification || notification.user.toString() !== req.user._id.toString()) {
        res.status(404);
        throw new Error('Notification not found');
    }
    notification.isRead = true;
    await notification.save();
    res.json({ success: true });
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true });
});

module.exports = { getMyNotifications, getUnreadCount, markAsRead, markAllAsRead };
