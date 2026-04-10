const Lead = require('../models/Lead');
const ActivityLog = require('../models/ActivityLog');
const { createObjectCsvStringifier } = require('csv-writer');

const logActivity = async (userId, leadId, action, details) => {
  await ActivityLog.create({ user_id: userId, lead_id: leadId, action, details });
};

exports.getLeads = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'Team Member') {
      query.assigned_to = req.user.id;
    }
    if (req.query.days) {
      const d = new Date(); d.setDate(d.getDate() - parseInt(req.query.days));
      query.createdAt = { $gte: d };
    }
    const leads = await Lead.find(query).populate('assigned_to', 'name email').populate('notes.addedBy', 'name');
    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createLead = async (req, res) => {
  try {
    const lead = await Lead.create(req.body);
    await logActivity(req.user.id, lead._id, 'Created Lead', `Lead ${lead.customer_name} created`);
    
    const io = req.app.get('io');
    io.emit('SERVER:LEAD_CREATED', await Lead.findById(lead._id).populate('assigned_to', 'name email'));
    
    res.status(201).json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateLead = async (req, res) => {
  const { id } = req.params;
  try {
    let lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    
    // Authorization check
    if (req.user.role === 'Team Member' && lead.assigned_to && lead.assigned_to.toString() !== req.user.id) {
       return res.status(403).json({ message: 'Not authorized to update this lead' });
    }

    const { status, assigned_to } = req.body;
    let oldStatus = lead.status;
    let oldAssigned = lead.assigned_to ? lead.assigned_to.toString() : null;

    lead = await Lead.findByIdAndUpdate(id, req.body, { new: true }).populate('assigned_to', 'name email').populate('notes.addedBy', 'name');
    
    let activityDetails = [];
    if (status && status !== oldStatus) activityDetails.push(`Status changed from ${oldStatus} to ${status}`);
    if (assigned_to && assigned_to !== oldAssigned) activityDetails.push(`Assigned to new member`);

    if (activityDetails.length > 0) {
      await logActivity(req.user.id, lead._id, 'Updated Lead', activityDetails.join(', '));
      const io = req.app.get('io');
      io.emit('SERVER:LEAD_UPDATED', lead);
    }
    
    res.json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    
    await Lead.findByIdAndDelete(req.params.id);
    await logActivity(req.user.id, lead._id, 'Deleted Lead', `Lead ${lead.customer_name} deleted`);
    
    const io = req.app.get('io');
    io.emit('SERVER:LEAD_DELETED', req.params.id);
    
    res.json({ message: 'Lead removed' });
  } catch(error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addNote = async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  try {
    let lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.notes.push({ text, addedBy: req.user.id });
    await lead.save();
    
    await logActivity(req.user.id, lead._id, 'Added Note', `Added note: ${text}`);

    lead = await Lead.findById(id).populate('assigned_to', 'name email').populate('notes.addedBy', 'name');
    const io = req.app.get('io');
    io.emit('SERVER:LEAD_UPDATED', lead);
    
    res.json(lead);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.exportLeads = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'Team Member') {
      query.assigned_to = req.user.id;
    }
    const leads = await Lead.find(query).populate('assigned_to', 'name');
    
    let summaryText = '';
    
    // Prepend Dashboard "Graphs" Equivalent data if user is an Admin
    if (req.user.role === 'Admin') {
      const totalLeads = await Lead.countDocuments();
      const converted = await Lead.countDocuments({ status: 'Closed / Converted' });
      const standardPending = await Lead.countDocuments({ status: { $in: ['New', 'Contacted', 'Negotiation', 'Payment Done'] } });
      const siteVisits = await Lead.countDocuments({ status: 'Site Visited' });

      summaryText += `PIPELINE OVERVIEW\n`;
      summaryText += `Metric,Count\n`;
      summaryText += `Total Leads,${totalLeads}\n`;
      summaryText += `Converted,${converted}\n`;
      summaryText += `Pending Action,${standardPending}\n`;
      summaryText += `Site Visits,${siteVisits}\n\n`;

      const teamStats = await Lead.aggregate([
        {
          $group: {
            _id: '$assigned_to',
            totalAssigned: { $sum: 1 },
            closed: { $sum: { $cond: [{ $eq: ['$status', 'Closed / Converted'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'Payment Done'] }, 0, 0] } }
          }
        },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'teamMember' } },
        { $unwind: { path: '$teamMember', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, name: { $ifNull: ['$teamMember.name', 'Unassigned'] }, totalAssigned: 1, closed: 1, rejected: 1 } }
      ]);

      summaryText += `TEAM MEMBER PERFORMANCE\n`;
      summaryText += `Member Name,Total Assigned,Closed,Rejected\n`;
      teamStats.forEach(member => {
         summaryText += `${member.name},${member.totalAssigned},${member.closed},${member.rejected}\n`;
      });
      summaryText += `\n`;
    }

    summaryText += `ALL LEADS RAW DATA\n`;

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'name', title: 'Customer Name' },
        { id: 'contact', title: 'Contact Info' },
        { id: 'interest', title: 'Property Interest' },
        { id: 'status', title: 'Status' },
        { id: 'assigned', title: 'Assigned To' },
        { id: 'source', title: 'Source' },
        { id: 'updated', title: 'Last Updated' }
      ]
    });

    const records = leads.map(l => ({
      name: l.customer_name,
      contact: l.contact_info,
      interest: l.property_interest || '',
      status: l.status,
      assigned: l.assigned_to ? l.assigned_to.name : 'Unassigned',
      source: l.source,
      updated: new Date(l.updatedAt).toLocaleDateString()
    }));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    
    const finalCsvString = summaryText + csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
    res.status(200).send(finalCsvString);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Only admin can view stats' });
    
    let query = {};
    if (req.query.days) {
      const d = new Date(); d.setDate(d.getDate() - parseInt(req.query.days));
      query.createdAt = { $gte: d };
    }
    
    const totalLeads = await Lead.countDocuments(query);
    const converted = await Lead.countDocuments({ ...query, status: 'Closed / Converted' });
    const standardPending = await Lead.countDocuments({ ...query, status: { $in: ['New', 'Contacted', 'Negotiation', 'Payment Done'] } });
    const siteVisits = await Lead.countDocuments({ ...query, status: 'Site Visited' });
    
    res.json({ totalLeads, converted, pending: standardPending, siteVisits });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTeamStats = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Not authorized' });

    const stats = await Lead.aggregate([
      {
        $group: {
          _id: '$assigned_to',
          totalAssigned: { $sum: 1 },
          closed: { 
             $sum: { $cond: [{ $eq: ['$status', 'Closed / Converted'] }, 1, 0] } 
          },
          rejected: {
             $sum: { $cond: [{ $eq: ['$status', 'Payment Done'] }, 0, 0] } // Default structure, maybe mapping specific rejected status if needed
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'teamMember'
        }
      },
      {
        $unwind: { path: '$teamMember', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ['$teamMember.name', 'Unassigned'] },
          totalAssigned: 1,
          closed: 1,
          rejected: 1
        }
      }
    ]);
    
    res.json(stats);
  } catch(error) {
     res.status(500).json({ message: error.message });
  }
};

exports.getAdvancedAnalytics = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Not authorized' });
    
    let days = parseInt(req.query.days) || 30;
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const sourceDistribution = await Lead.aggregate([
      { $match: { createdAt: { $gte: dateLimit } } },
      { $group: { _id: { $ifNull: ['$source', 'Unknown'] }, count: { $sum: 1 } } }
    ]);

    const trendData = await Lead.aggregate([
      { $match: { createdAt: { $gte: dateLimit } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({ sourceDistribution, trendData });
  } catch(error) {
    res.status(500).json({ message: error.message });
  }
};
