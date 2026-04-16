const asyncHandler = require('express-async-handler');
const Policy = require('../models/Policy');
const User = require('../models/User');
const Claim = require('../models/Claim');
const UserPolicy = require('../models/UserPolicy');
const Commission = require('../models/Commission');
const PolicyApplication = require('../models/PolicyApplication');
const AgentApplication = require('../models/AgentApplication');

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

    // 5. Recent Activity Feed
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(3);
    const recentUserPolicies = await UserPolicy.find().populate('policy user').sort({ createdAt: -1 }).limit(3);
    const recentClaims = await Claim.find().populate('user').sort({ createdAt: -1 }).limit(3);

    const recentActivities = [
        ...recentUsers.map(u => ({
            type: 'new_user',
            description: `New user registered: ${u.name} (${u.role})`,
            date: u.createdAt
        })),
        ...recentUserPolicies.map(up => ({
            type: 'new_policy',
            description: `Policy issued to ${up.user?.name}: ${up.policy?.policyName}`,
            date: up.createdAt
        })),
        ...recentClaims.map(c => ({
            type: 'new_claim',
            description: `Claim filed by ${c.user?.name} for ₹${c.amount}`,
            date: c.createdAt
        }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    // 6. Top Performing Agents (by policy count and commission)
    const topAgents = await Promise.all(agents.map(async (agent) => {
        const policyCount = await UserPolicy.countDocuments({ agent: agent._id, status: 'Active' });
        const commissions = await Commission.find({ agent: agent._id });
        const totalRev = commissions.reduce((acc, curr) => acc + curr.amount, 0);
        return {
            _id: agent._id,
            name: agent.name,
            email: agent.email,
            policiesSold: policyCount,
            revenue: totalRev
        };
    }));

    // Sort by revenue and take top 4
    const sortedTopAgents = topAgents.sort((a, b) => b.revenue - a.revenue).slice(0, 4);

    // 7. Pending Actions (Wait for approval applications + pending claims + pending agent apps)
    const pendingApps = await PolicyApplication.countDocuments({ status: 'Pending' });
    const pendingAgentApps = await AgentApplication.countDocuments({ status: 'pending' });
    const pendingClaimsCount = claims.filter(c => c.status === 'Pending').length;

    res.json({
        stats: {
            totalRevenue,
            totalPolicies: policies.length,
            totalCustomers: customers.length,
            totalAgents: agents.length,
            activePolicies: userPolicies.filter(up => up.status === 'Active').length,
            pendingActions: pendingApps + pendingClaimsCount + pendingAgentApps
        },
        charts: {
            policyDistribution: policyDistribution.map(p => ({
                ...p,
                value: Math.round((p.value / (policies.length || 1)) * 100)
            })),
            claimStatusDistribution,
            performanceData
        },
        recentActivities: recentActivities.map(a => ({
            ...a,
            time: a.date // Frontend will format
        })),
        topAgents: sortedTopAgents
    });
});

// @desc    Get system stats for agent
// @route   GET /api/stats/agent
// @access  Private/Agent
const getAgentStats = asyncHandler(async (req, res) => {
    const agentId = req.user._id;

    // 1. Total assigned customers
    const totalCustomers = await User.countDocuments({ assignedAgent: agentId, role: 'customer' });

    // 2. Pending applications linked to this agent
    const pendingApplications = await PolicyApplication.countDocuments({ 
        agent: agentId, 
        status: 'Pending' 
    });

    // 3. Approved/Active Policies managed by this agent
    const activePoliciesCount = await UserPolicy.countDocuments({ agent: agentId, status: 'Active' });

    // 4. Commission Total
    const commissions = await Commission.find({ agent: agentId });
    const totalCommission = commissions.reduce((acc, curr) => acc + curr.amount, 0);

    // 5. Claims to Review (for policies managed by this agent)
    const agentPolicyIds = await UserPolicy.find({ agent: agentId }).distinct('_id');
    const claims = await Claim.find({ userPolicy: { $in: agentPolicyIds } });
    const claimsToReview = claims.filter(c => c.status === 'Pending').length;

    // 6. Sales Trend (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const userPolicies = await UserPolicy.find({ 
        agent: agentId,
        createdAt: { $gte: sixMonthsAgo }
    });

    const monthlyStats = userPolicies.reduce((acc, curr) => {
        const month = new Date(curr.createdAt).toLocaleString('default', { month: 'short' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
    }, {});

    const salesTrend = Object.keys(monthlyStats).map(month => ({
        name: month,
        value: monthlyStats[month]
    }));

    // 7. Policy Type Distribution
    const populatedPolicies = await UserPolicy.find({ agent: agentId }).populate('policy');
    const typeMap = {};
    populatedPolicies.forEach(up => {
        if (up.policy) {
            typeMap[up.policy.policyType] = (typeMap[up.policy.policyType] || 0) + 1;
        }
    });
    
    const totalPolicies = populatedPolicies.length || 1;
    const policyTypeDistribution = Object.keys(typeMap).map(type => ({
        name: type,
        value: Math.round((typeMap[type] / totalPolicies) * 100),
        color: type === 'Health' ? '#14b8a6' : type === 'Life' ? '#0ea5e9' : type === 'Vehicle' ? '#f59e0b' : '#94a3b8'
    }));

    res.json({
        stats: {
            assignedCustomers: totalCustomers,
            pendingApplications,
            activePolicies: activePoliciesCount,
            totalCommission,
            claimsToReview
        },
        charts: {
            salesTrend,
            policyTypeDistribution,
            claimStatusDistribution: [
                { name: 'Pending', value: claimsToReview },
                { name: 'Approved', value: claims.filter(c => c.status === 'Approved').length },
                { name: 'Rejected', value: claims.filter(c => c.status === 'Rejected').length },
            ]
        }
    });
});

// @desc    Get public stats for landing page
// @route   GET /api/stats/public
// @access  Public
const getPublicStats = asyncHandler(async (req, res) => {
    const policyCount = await Policy.countDocuments();
    const userCount = await User.countDocuments({ role: 'customer' });
    const claimSettlementRate = 99; // Hardcoded business logic metric
    const partnerCount = 100; // Hardcoded business logic metric

    res.json({
        policies: `${policyCount}+`,
        customers: `${(userCount + 10000).toLocaleString()}+`, // Adding base for demonstration if DB is empty
        settlementRate: `${claimSettlementRate}%`,
        partners: `${partnerCount}+`
    });
});

module.exports = {
    getAdminStats,
    getAgentStats,
    getPublicStats
};
