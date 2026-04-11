const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const Payment = require('../models/Payment');
const UserPolicy = require('../models/UserPolicy');
const Policy = require('../models/Policy');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const PolicyApplication = require('../models/PolicyApplication');

// @desc    Create Razorpay Order
// @route   POST /api/payments/order
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
    const { amount, receipt, policyId, applicationId } = req.body;

    if (!amount || (!policyId && !applicationId)) {
        res.status(400);
        throw new Error('Amount and Policy/Application ID are required');
    }

    const options = {
        amount: Number(amount), 
        currency: "INR",
        receipt: receipt || `receipt_order_${Date.now()}`,
    };

    try {
        const order = await razorpay().orders.create(options);

        // Save order details to DB (initial status: created)
        await Payment.create({
            userId: req.user._id, 
            policyId: policyId || undefined,
            applicationId: applicationId || undefined,
            razorpayOrderId: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            status: 'created',
            paymentId: 'pending'
        });

        res.json(order);
    } catch (error) {
        console.error("Razorpay Order Creation Error Detail:", error);
        res.status(500);
        throw new Error(`Unable to create Razorpay order: ${error.message}`);
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

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    const isMatch = expectedSignature === razorpay_signature;

    if (isMatch) {
        // 1. Update Payment record
        const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
        
        if (payment) {
            payment.razorpayPaymentId = razorpay_payment_id;
            payment.razorpaySignature = razorpay_signature;
            payment.status = 'success';
            await payment.save();

            const user = await User.findById(req.user._id);
            const policyDetails = await Policy.findById(payment.policyId);

            let newUserPolicy;
            if (policyDetails && user) {
                // 2. Create Transaction record (for Payment History)
                await Transaction.create({
                    user: req.user._id,
                    policy: payment.policyId,
                    amount: payment.amount / 100, // stored in paise, convert back to rupees
                    transactionId: razorpay_payment_id,
                    paymentMethod: 'Razorpay',
                    status: 'Success'
                });

                // 3. Create UserPolicy record
                const startDate = new Date();
                const endDate = new Date();
                endDate.setFullYear(startDate.getFullYear() + (policyDetails.durationYears || 1));

                newUserPolicy = await UserPolicy.create({
                    user: req.user._id,
                    policy: payment.policyId,
                    agent: user?.assignedAgent || undefined,
                    policyNumber: `SP${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 100)}`,
                    startDate,
                    endDate,
                    status: 'Active'
                });
            }

            // 4. Update PolicyApplication status if it exists
            if (payment.applicationId) {
                await PolicyApplication.findByIdAndUpdate(payment.applicationId, { 
                    status: 'Paid' 
                });
                console.log(`📝 Application ${payment.applicationId} updated to Paid.`);
            }

            res.json({
                success: true,
                message: 'Payment verified and policy provisioned successfully',
                policyNumber: newUserPolicy?.policyNumber
            });
        } else {
            res.status(404);
            throw new Error('Payment record not found');
        }
    } else {
        const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
        if (payment) {
            payment.status = 'failed';
            await payment.save();
        }

        res.status(400);
        throw new Error('Payment verification failed');
    }
});

module.exports = {
    createOrder,
    verifyPayment
};
