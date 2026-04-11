const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const PolicyApplication = require('../models/PolicyApplication');
const UserPolicy = require('../models/UserPolicy');
const Policy = require('../models/Policy');
const Commission = require('../models/Commission');
const Transaction = require('../models/Transaction');
const Claim = require('../models/Claim');
const sendEmail = require('../utils/sendEmail');

// @desc    Get all agents with performance stats
// @route   GET /api/admin/agents
// @access  Private/Admin
const getAgents = asyncHandler(async (req, res) => {
    const pageSize = Number(req.query.limit) || 10;
    const page = Number(req.query.page) || 1;

    const query = { role: 'agent' };
    if (req.query.search) {
        query.$or = [
            { name: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } }
        ];
    }

    const count = await User.countDocuments(query);
    const agents = await User.find(query)
        .select('-password')
        .limit(pageSize)
        .skip(pageSize * (page - 1))
        .sort({ createdAt: -1 });
    
    // Enrich with stats (now restricted to pagination window for performance)
    const enrichedAgents = await Promise.all(agents.map(async (agent) => {
        const customerCount = await User.countDocuments({ assignedAgent: agent._id });
        const salesCount = await Commission.countDocuments({ agent: agent._id });
        const totalCommission = await Commission.aggregate([
            { $match: { agent: agent._id } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        return {
            ...agent.toObject(), // BUG FIX: agent._doc skips virtuals; use .toObject() instead
            stats: {
                customers: customerCount,
                sales: salesCount,
                earnings: totalCommission[0]?.total || 0
            }
        };
    }));

    res.json({
        agents: enrichedAgents,
        page,
        pages: Math.ceil(count / pageSize),
        total: count
    });
});

// @desc    Create a new agent account
// @route   POST /api/admin/agents
// @access  Private/Admin
const createAgent = asyncHandler(async (req, res) => {
    const { name, email, password, phone, dob, gender, address, commissionRate } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const agent = await User.create({
        name,
        email,
        password,
        role: 'agent',
        phone,
        dob,
        gender,
        address,
        commissionRate: commissionRate || 10,
        isVerified: true // Admins create verified agents
    });

    if (agent) {
        // Notify agent of account creation
        // BUG FIX: sendEmail signature is sendEmail(emailOpts, notificationOpts).
        // The old code passed a single object mixing both concerns — the notification
        // data was being silently ignored. Correct: pass two separate arguments.
        sendEmail(
            {
                to: agent.email,
                subject: '💼 Welcome to the ShieldPro Force!',
                html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#0a0a0f;color:#fff;border-radius:16px;">
                <h2 style="color:#f59e0b;">Welcome, ${agent.name}! 🚀</h2>
                <p>Your agent account has been created by the administration. You are now part of our distributed workforce.</p>
                <div style="background:rgba(255,255,255,0.05);padding:16px;border-radius:12px;margin:16px 0;">
                    <p style="margin:0;font-size:14px;opacity:0.6;">Your Access Credentials:</p>
                    <p style="margin:8px 0 0;font-weight:bold;">Email: ${agent.email}</p>
                    <p style="margin:4px 0 0;font-weight:bold;">Password: ${password}</p>
                </div>
                <p>Please log in to your dashboard to start managing your leads and commissions.</p>
                <a href="${process.env.FRONTEND_URL || 'https://shield-pro-frontend.vercel.app'}/login" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#f59e0b;color:#000;border-radius:8px;font-weight:bold;text-decoration:none;">Agent Login →</a>
            </div>`
            },
            {
                userId: agent._id,
                title: 'Welcome to the Force!',
                message: `Hi ${agent.name}, your agent account is now active. Check your email for login credentials.`,
                type: 'success'
            }
        ).catch(e => console.error('Agent welcome email error:', e.message));

        res.status(201).json({
            _id: agent._id,
            name: agent.name,
            email: agent.email,
            role: agent.role
        });
    } else {
        res.status(400);
        throw new Error('Invalid agent data');
    }
});

// @desc    Update agent status (Activate/Suspend)
// @route   PUT /api/admin/agents/:id/status
// @access  Private/Admin
const updateAgentStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const agent = await User.findById(req.params.id);

    if (agent) {
        agent.status = status;
        await agent.save();
        res.json({ message: `Agent status updated to ${status}` });
    } else {
        res.status(404);
        throw new Error('Agent not found');
    }
});

// @desc    Get all customers with agent info
// @route   GET /api/admin/customers
// @access  Private/Admin
const getCustomers = asyncHandler(async (req, res) => {
    const pageSize = Number(req.query.limit) || 10;
    const page = Number(req.query.page) || 1;

    const query = { role: 'customer' };
    if (req.query.search) {
        query.$or = [
            { name: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } },
            { phone: { $regex: req.query.search, $options: 'i' } }
        ];
    }

    const count = await User.countDocuments(query);
    const customers = await User.find(query)
        .populate('assignedAgent', 'name email')
        .select('-password')
        .limit(pageSize)
        .skip(pageSize * (page - 1))
        .sort({ createdAt: -1 });

    const enrichedCustomers = await Promise.all(customers.map(async (customer) => {
        const claimsCount = await Claim.countDocuments({ user: customer._id });
        
        // Fetch UserPolicies with Active status and populate Policy to get premiumAmount
        const activePolicies = await UserPolicy.find({ user: customer._id, status: 'Active' })
            .populate('policy', 'premiumAmount');
        
        const activePoliciesCount = activePolicies.length;
        const totalPremium = activePolicies.reduce((sum, up) => sum + (up.policy?.premiumAmount || 0), 0);
        
        // Calculate Total Paid from successful transactions
        const successfulTransactions = await Transaction.find({ user: customer._id, status: 'Success' });
        const totalPaid = successfulTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

        return {
            ...customer._doc,
            claims: claimsCount,
            activePoliciesCount,
            totalPremium,
            totalPaid
        };
    }));

    res.json({
        customers: enrichedCustomers,
        page,
        pages: Math.ceil(count / pageSize),
        total: count
    });
});

// @desc    Reassign customer to a different agent
// @route   PUT /api/admin/customers/:id/reassign
// @access  Private/Admin
const reassignAgent = asyncHandler(async (req, res) => {
    const { agentId } = req.body;
    const customer = await User.findById(req.params.id);

    if (customer) {
        customer.assignedAgent = agentId;
        await customer.save();
        res.json({ message: 'Customer reassigned successfully' });
    } else {
        res.status(404);
        throw new Error('Customer not found');
    }
});

// @desc    Get detailed platform insights (Reporting)
// @route   GET /api/admin/reports/insights
// @access  Private/Admin
const getInsights = asyncHandler(async (req, res) => {
    const policyPopularity = await PolicyApplication.aggregate([
        { $group: { _id: '$policy', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]);

    const performance = await Commission.aggregate([
        { $group: { _id: '$agent', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } }
    ]);

    res.json({ policyPopularity, performance });
});

// @desc    Export Transactions as CSV
// @route   GET /api/admin/export/transactions
// @access  Private/Admin
const exportTransactions = asyncHandler(async (req, res) => {
    const transactions = await Transaction.find({})
        .populate('user', 'name email')
        .populate('policy', 'policyName');

    let csv = 'Transaction ID,Date,Customer,Email,Policy,Amount,Status\n';
    
    transactions.forEach(t => {
        csv += `${t.transactionId},${t.paymentDate},${t.user?.name},${t.user?.email},${t.policy?.policyName},${t.amount},${t.status}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions_report.csv');
    res.status(200).send(csv);
});

// @desc    Export Commissions as CSV
// @route   GET /api/admin/export/commissions
// @access  Private/Admin
const exportCommissions = asyncHandler(async (req, res) => {
    const commissions = await Commission.find({})
        .populate('agent', 'name email')
        .populate('customer', 'name')
        .populate('policy', 'policyName');

    let csv = 'Commission ID,Date,Agent,Agent Email,Customer,Policy,Amount,Status\n';
    
    commissions.forEach(c => {
        csv += `${c._id},${c.createdAt},${c.agent?.name},${c.agent?.email},${c.customer?.name},${c.policy?.policyName},${c.amount},${c.status}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=commissions_report.csv');
    res.status(200).send(csv);
});

// @desc    Get all claims (Admin)
// @route   GET /api/admin/claims
// @access  Private/Admin
const getClaims = asyncHandler(async (req, res) => {
    const claims = await Claim.find()
        .populate('user', 'name email')
        .populate({
            path: 'userPolicy',
            populate: [
                { path: 'policy', select: 'policyName policyType' },
                { path: 'agent', select: 'name email role' }
            ]
        })
        .sort({ createdAt: -1 });
    res.json(claims);
});

// @desc    Get all transactions (Admin)
// @route   GET /api/admin/transactions
// @access  Private/Admin
const getTransactions = asyncHandler(async (req, res) => {
    const transactions = await Transaction.find()
        .populate('user', 'name email')
        .populate('policy', 'policyName')
        .sort({ createdAt: -1 });
    res.json(transactions);
});

// @desc    Get all commissions (Admin)
// @route   GET /api/admin/commissions
// @access  Private/Admin
const getCommissions = asyncHandler(async (req, res) => {
    const commissions = await Commission.find()
        .populate('agent', 'name email')
        .populate('customer', 'name email')
        .populate('policy', 'policyName')
        .sort({ createdAt: -1 });
    res.json(commissions);
});

// @desc    Update claim status (Admin)
// @route   PUT /api/admin/claims/:id/status
// @access  Private/Admin
const updateClaimStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const claim = await Claim.findById(req.params.id);

    if (claim) {
        claim.status = status;
        await claim.save();
        res.json({ message: `Claim status updated to ${status}` });
    } else {
        res.status(404);
        throw new Error('Claim not found');
    }
});

// @desc    Delete a claim (Admin)
// @route   DELETE /api/admin/claims/:id
// @access  Private/Admin
const deleteClaim = asyncHandler(async (req, res) => {
    const claim = await Claim.findById(req.params.id);

    if (claim) {
        await Claim.findByIdAndDelete(req.params.id);
        res.json({ message: 'Claim deleted successfully', id: req.params.id });
    } else {
        res.status(404);
        throw new Error('Claim not found');
    }
});

// @desc    Update a customer (Admin)
// @route   PUT /api/admin/customers/:id
// @access  Private/Admin
const updateCustomer = asyncHandler(async (req, res) => {
    const { name, email, phone, status } = req.body;
    const customer = await User.findById(req.params.id);

    if (!customer || customer.role !== 'customer') {
        res.status(404);
        throw new Error('Customer not found');
    }

    // Check if email already exists for another user
    if (email && email !== customer.email) {
        const emailExists = await User.findOne({ email });
        if (emailExists) {
            res.status(400);
            throw new Error('Email already registered');
        }
        customer.email = email;
    }

    customer.name = name || customer.name;
    customer.phone = phone || customer.phone;
    customer.status = status || customer.status;

    const updatedCustomer = await customer.save();
    res.json(updatedCustomer);
});

module.exports = {
    getAgents,
    createAgent,
    updateAgentStatus,
    getCustomers,
    reassignAgent,
    getInsights,
    exportTransactions,
    exportCommissions,
    getClaims,
    getTransactions,
    getCommissions,
    updateClaimStatus,
    deleteClaim,
    updateCustomer
};
