const asyncHandler = require('express-async-handler');
const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
    const { receiverId, content } = req.body;

    const receiver = await User.findById(receiverId);
    if (!receiver) {
        res.status(404);
        throw new Error('Receiver not found');
    }

    const message = await Message.create({
        sender: req.user._id,
        receiver: receiverId,
        content
    });

    res.status(201).json(message);
});

// @desc    Get messages for current user
// @route   GET /api/messages
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
    const messages = await Message.find({
        $or: [
            { sender: req.user._id },
            { receiver: req.user._id }
        ]
    })
        .populate('sender', 'name email role')
        .populate('receiver', 'name email role')
        .sort({ createdAt: -1 });

    res.json(messages);
});

// @desc    Mark message as read
// @route   PUT /api/messages/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
    const message = await Message.findById(req.params.id);

    if (!message) {
        res.status(404);
        throw new Error('Message not found');
    }

    if (message.receiver.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized');
    }

    message.isRead = true;
    await message.save();

    res.json({ success: true });
});

module.exports = {
    sendMessage,
    getMessages,
    markAsRead
};
