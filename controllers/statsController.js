const asyncHandler = require('express-async-handler');
const Policy = require('../models/Policy');
const User = require('../models/User');
const Claim = require('../models/Claim');
const UserPolicy = require('../models/UserPolicy');
const Commission = require('../models/Commission');
const PolicyApplication = require('../models/PolicyApplication');

// @desc    Get system stats for admin
// @route   GET /api/stats/admin
// @access  Private/Admin
const getAdminStats = asyncHandler(async (req, res) => {
    // Fetch all needed data
    const policies = await Policy.find();
    const userPolicies = await UserPolicy.find().populate('policy');
    const customers = await User.find({ role: 'customer' });
    const agents = await User.find({ role: 'agent' });
    const claims = await Claim.find();

    // 1. Total Revenue (Sum of premiumAmount from all active UserPolicies)
    const totalRevenue = userPolicies.reduce((acc, curr) => {
        if (curr.status === 'Active' && curr.policy) {
            return acc + curr.policy.premiumAmount;
        }
        return acc;
    }, 0);

    // 2. Policy Distribution (by policyType)
    const typeMap = {};
    policies.forEach(p => {
        typeMap[p.policyType] = (typeMap[p.policyType] || 0) + 1;
    });
    const policyDistribution = Object.keys(typeMap).map(name => ({
        name,
        value: typeMap[name]
    }));

    // 3. Claim Status Distribution
    const claimStatusDistribution = [
        { name: 'Pending', value: claims.filter(c => c.status === 'Pending').length },
        { name: 'Approved', value: claims.filter(c => c.status === 'Approved').length },
        { name: 'Rejected', value: claims.filter(c => c.status === 'Rejected').length },
    ];

    // 4. Monthly Purchases (Simple mock historical data or real if we had timestamps)
    // For now, let's just group by month from UserPolicy createdAt
    const monthlyStats = userPolicies.reduce((acc, curr) => {
        const month = new Date(curr.createdAt).toLocaleString('default', { month: 'short' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
    }, {});
    const performanceData = Object.keys(monthlyStats).map(month => ({
        name: month,
        value: monthlyStats[month]
    }));

    res.json({
        stats: {
            totalRevenue,
            totalPolicies: policies.length,
            totalCustomers: customers.length,
            totalAgents: agents.length,
            activePolicies: userPolicies.filter(up => up.status === 'Active').length
        },
        charts: {
            policyDistribution,
            claimStatusDistribution,
            performanceData
        },
        recentUsers: customers.slice(-5).map(u => ({ id: u._id, name: u.name, email: u.email })),
        recentAgents: agents.slice(-5).map(a => ({ id: a._id, name: a.name, email: a.email }))
    });
});

// @desc    Get system stats for agent
// @route   GET /api/stats/agent
// @access  Private/Agent
const getAgentStats = asyncHandler(async (req, res) => {
    const agentId = req.user._id;

    // 1. Total assigned customers
    const totalCustomers = await User.countDocuments({ assignedAgent: agentId, role: 'customer' });

    // 2. Pending applications for this agent's customers
    // Note: This requires customers to be assigned.
    // Or check applications where agentId matches.
    const pendingApplications = await PolicyApplication.countDocuments({ 
        $or: [
            { agent: agentId, status: 'Pending' },
            { user: { $in: await User.find({ assignedAgent: agentId }).distinct('_id') }, status: 'Pending' }
        ]
    });

    // 3. Approved/Active Policies linked to this agent
    const activePolicies = await UserPolicy.countDocuments({ agent: agentId, status: 'Active' });

    // 4. Commission Total
    const commissions = await Commission.find({ agent: agentId });
    const totalCommission = commissions.reduce((acc, curr) => acc + curr.amount, 0);

    // 5. Chart Data: Claim Distribution among this agent's policies
    // Find all UserPolicies for this agent
    const agentPolicyIds = await UserPolicy.find({ agent: agentId }).distinct('_id');
    const claims = await Claim.find({ userPolicy: { $in: agentPolicyIds } });
    
    const claimStatusDistribution = [
        { name: 'Pending', value: claims.filter(c => c.status === 'Pending').length },
        { name: 'Approved', value: claims.filter(c => c.status === 'Approved').length },
        { name: 'Rejected', value: claims.filter(c => c.status === 'Rejected').length },
    ];

    res.json({
        stats: {
            assignedCustomers: totalCustomers,
            pendingApplications,
            activePolicies,
            totalCommission
        },
        charts: {
            claimStatusDistribution
        }
    });
});

module.exports = {
    getAdminStats,
    getAgentStats
};
