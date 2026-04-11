const Razorpay = require('razorpay');

// Lazy initialization — instance is created on first use, not at module load.
// This prevents a server crash at startup if env vars are not yet available.
let _instance = null;

const getRazorpayInstance = () => {
    if (!_instance) {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            throw new Error(
                'Missing Razorpay env vars: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in the environment.'
            );
        }
        _instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return _instance;
};

module.exports = getRazorpayInstance;
