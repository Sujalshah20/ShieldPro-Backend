const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const Payment = require('../models/Payment');
const asyncHandler = require('express-async-handler');

// @desc    Create Razorpay Order
// @route   POST /api/payments/order
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
    const { amount, receipt } = req.body;

    if (!amount) {
        res.status(400);
        throw new Error('Amount is required (in paise)');
    }

    const options = {
        amount: Number(amount), // amount in the smallest currency unit (paise)
        currency: "INR",
        receipt: receipt || `receipt_order_${Date.now()}`,
    };

    try {
        const order = await razorpay.orders.create(options);

        // Save order details to DB (initial status: created)
        await Payment.create({
            userId: req.user._id, 
            razorpayOrderId: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            status: 'created'
        });

        res.json(order);
    } catch (error) {
        console.error("Razorpay Order Error:", error);
        res.status(500);
        throw new Error('Unable to create Razorpay order');
    }
});

// @desc    Verify Razorpay Payment Signature
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
    const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature 
    } = req.body;

    // Formula: SHA256(order_id + "|" + payment_id, secret)
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    const isMatch = expectedSignature === razorpay_signature;

    if (isMatch) {
        // Update payment status in DB
        const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
        if (payment) {
            payment.razorpayPaymentId = razorpay_payment_id;
            payment.razorpaySignature = razorpay_signature;
            payment.status = 'success';
            await payment.save();
        }

        res.json({
            success: true,
            message: 'Payment verified successfully'
        });
    } else {
        // Update payment status as failed in DB
        const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
        if (payment) {
            payment.status = 'failed';
            await payment.save();
        }

        res.status(400);
        throw new Error('Payment verification failed (Invalid signature)');
    }
});

module.exports = {
    createOrder,
    verifyPayment
};
