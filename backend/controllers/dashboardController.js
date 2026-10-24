const Lead = require('../models/Lead');
const Reminder = require('../models/Reminder');

const getStats = async (req, res) => {
  try {
    // Keep dashboard counts consistent with /api/leads: every user, including
    // admins, sees only their own CRM records. Admin role is for user management,
    // not cross-user access to private leads.
    const filter = { userId: req.user._id };

    const [
      totalLeads,
      leadsByStatusArr,
      leadsBySourceArr,
      recentLeads,
      upcomingReminders,
      overdueLeads,
    ] = await Promise.all([
      Lead.countDocuments(filter),
      Lead.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: filter },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
      Lead.find(filter).sort({ createdAt: -1 }).limit(10).select('customerName phone status source createdAt followUpDate'),
      Reminder.find({ userId: req.user._id, isCompleted: false, reminderDate: { $gte: new Date() } })
        .populate('leadId', 'customerName phone')
        .sort({ reminderDate: 1 })
        .limit(5),
      Lead.countDocuments({
        ...filter,
        followUpDate: { $lt: new Date() },
        status: { $nin: ['Converted', 'Lost'] },
      }),
    ]);

    const leadsByStatus = Object.fromEntries(leadsByStatusArr.map(({ _id, count }) => [_id, count]));
    const leadsBySource = Object.fromEntries(leadsBySourceArr.map(({ _id, count }) => [_id, count]));

    const converted = leadsByStatus.Converted || 0;
    const conversionRate = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        totalLeads,
        leadsByStatus,
        leadsBySource,
        conversionRate: parseFloat(conversionRate),
        recentLeads,
        upcomingReminders,
        overdueLeads,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getStats };
