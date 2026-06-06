const Lead = require('../models/Lead');
const Category = require('../models/Category');
const User = require('../models/User');
const FollowUp = require('../models/FollowUp');

// Get leads list with search, pagination, and advanced filters
exports.getLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.q || '';
    
    // Construct lead query
    let query = {};

    // Role restriction
    if (req.user.role !== 'Admin') {
      query.assignedTo = req.user._id;
    }

    // Free Text Search (Name, Email, Store Name, Mobile Numbers)
    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { storeName: { $regex: search, $options: 'i' } },
          { 'mobileNumbers.number': { $regex: search, $options: 'i' } }
        ]
      });
    }

    // Advanced Filters
    const { status, priority, category, assignedTo, budgetMin, budgetMax, city, country, startDate, endDate } = req.query;

    if (status) {
      query.status = status;
    }
    if (priority) {
      query.priority = priority;
    }
    if (category) {
      query.categories = category;
    }
    if (req.user.role === 'Admin' && assignedTo) {
      query.assignedTo = assignedTo;
    }
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }
    if (country) {
      query.country = { $regex: country, $options: 'i' };
    }
    
    // Budget range filter
    if (budgetMin || budgetMax) {
      query.budget = {};
      if (budgetMin) {
        query.budget.$gte = Number(budgetMin);
      }
      if (budgetMax) {
        query.budget.$lte = Number(budgetMax);
      }
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const totalLeads = await Lead.countDocuments(query);
    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Fetch filters options
    const categories = await Category.find().sort({ name: 1 });
    const agents = req.user.role === 'Admin' ? await User.find({ isActive: true }).sort({ name: 1 }) : [];

    res.render('leads/index', {
      title: 'Leads Pipeline',
      leads,
      currentPage: page,
      totalPages: Math.ceil(totalLeads / limit),
      limit,
      searchQuery: search,
      totalCount: totalLeads,
      categories,
      agents,
      filters: {
        status: status || '',
        priority: priority || '',
        category: category || '',
        assignedTo: assignedTo || '',
        budgetMin: budgetMin || '',
        budgetMax: budgetMax || '',
        city: city || '',
        country: country || '',
        startDate: startDate || '',
        endDate: endDate || ''
      }
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    req.session.error_msg = 'Failed to load leads list';
    res.redirect('/');
  }
};

// Render form to add lead
exports.getAddLead = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    const agents = await User.find({ isActive: true }).sort({ name: 1 });
    
    res.render('leads/add', {
      title: 'Add New Lead',
      categories,
      agents
    });
  } catch (error) {
    console.error('Error loading add-lead page:', error);
    req.session.error_msg = 'Failed to load lead creation form';
    res.redirect('/leads');
  }
};

// Handle lead submission
exports.postAddLead = async (req, res) => {
  const { name, email, mobileNumbers, address, city, country, storeName, categories, budget, leadSource, assignedTo, priority, notes, nextFollowupDate, expectedClosingDate } = req.body;

  try {
    if (!name || !mobileNumbers) {
      req.session.error_msg = 'Name and Mobile Number are required';
      return res.redirect('/leads/add');
    }

    // Format mobile numbers array from comma-separated string
    const formattedNumbers = mobileNumbers.split(',')
      .map(num => ({ number: num.trim() }))
      .filter(obj => obj.number.length > 0);

    if (formattedNumbers.length === 0) {
      req.session.error_msg = 'Please enter at least one valid mobile number';
      return res.redirect('/leads/add');
    }

    // Determine assignee
    let leadAssignee = req.user._id;
    if (req.user.role === 'Admin') {
      leadAssignee = assignedTo ? assignedTo : req.user._id;
    }

    // Parse categories (comes as array or single string from checkbox grid)
    let leadCategories = [];
    if (categories) {
      leadCategories = Array.isArray(categories) ? categories : [categories];
    }

    const newLead = new Lead({
      name,
      email: email || undefined,
      mobileNumbers: formattedNumbers,
      address,
      city,
      country,
      storeName,
      categories: leadCategories,
      budget: Number(budget) || 0,
      leadSource: leadSource || 'Cold Calling',
      assignedTo: leadAssignee,
      createdBy: req.user._id,
      status: 'New Lead',
      priority: priority || 'Medium',
      nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate) : undefined,
      expectedClosingDate: expectedClosingDate ? new Date(expectedClosingDate) : undefined,
      notes,
      timeline: [
        {
          action: 'Lead Created',
          detail: `Lead created by ${req.user.name} and assigned to owner.`,
          performedBy: req.user._id
        }
      ]
    });

    await newLead.save();
    req.session.success_msg = `Lead for "${name}" has been successfully added.`;
    res.redirect('/leads');
  } catch (error) {
    console.error('Error creating lead:', error);
    req.session.error_msg = error.message || 'Failed to add lead';
    res.redirect('/leads/add');
  }
};

// View Lead Details
exports.getLeadDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const lead = await Lead.findById(id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('timeline.performedBy', 'name role');

    if (!lead) {
      req.session.error_msg = 'Lead not found';
      return res.redirect('/leads');
    }

    // Check ownership for sales reps
    if (req.user.role !== 'Admin' && lead.assignedTo._id.toString() !== req.user._id.toString()) {
      req.session.error_msg = 'You are not authorized to view this lead';
      return res.redirect('/leads');
    }

    // Fetch separate FollowUp history
    const followups = await FollowUp.find({ leadId: id })
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });

    res.render('leads/view', {
      title: `${lead.name} | Lead Details`,
      lead,
      followups
    });
  } catch (error) {
    console.error('Error fetching lead details:', error);
    req.session.error_msg = 'Error loading lead details';
    res.redirect('/leads');
  }
};

// Render form to edit lead
exports.getEditLead = async (req, res) => {
  const { id } = req.params;

  try {
    const lead = await Lead.findById(id);
    if (!lead) {
      req.session.error_msg = 'Lead not found';
      return res.redirect('/leads');
    }

    // Check ownership
    if (req.user.role !== 'Admin' && lead.assignedTo.toString() !== req.user._id.toString()) {
      req.session.error_msg = 'You are not authorized to edit this lead';
      return res.redirect('/leads');
    }

    const categories = await Category.find().sort({ name: 1 });
    const agents = await User.find({ isActive: true }).sort({ name: 1 });

    res.render('leads/edit', {
      title: `Edit ${lead.name}`,
      lead,
      categories,
      agents
    });
  } catch (error) {
    console.error('Error loading edit lead page:', error);
    req.session.error_msg = 'Error loading edit form';
    res.redirect('/leads');
  }
};

// Handle lead edits
exports.postEditLead = async (req, res) => {
  const { id } = req.params;
  const { name, email, mobileNumbers, address, city, country, storeName, categories, budget, leadSource, assignedTo, status, priority, notes, nextFollowupDate, expectedClosingDate } = req.body;

  try {
    const lead = await Lead.findById(id);
    if (!lead) {
      req.session.error_msg = 'Lead not found';
      return res.redirect('/leads');
    }

    // Check ownership
    if (req.user.role !== 'Admin' && lead.assignedTo.toString() !== req.user._id.toString()) {
      req.session.error_msg = 'You are not authorized to modify this lead';
      return res.redirect('/leads');
    }

    if (!name || !mobileNumbers) {
      req.session.error_msg = 'Name and Mobile Number are required';
      return res.redirect(`/leads/edit/${id}`);
    }

    // Format numbers
    const formattedNumbers = mobileNumbers.split(',')
      .map(num => ({ number: num.trim() }))
      .filter(obj => obj.number.length > 0);

    if (formattedNumbers.length === 0) {
      req.session.error_msg = 'Please enter at least one valid mobile number';
      return res.redirect(`/leads/edit/${id}`);
    }

    // Parse categories
    let leadCategories = [];
    if (categories) {
      leadCategories = Array.isArray(categories) ? categories : [categories];
    }

    // Timeline changes tracking
    let timelineEntries = [];

    // Track status change
    if (status !== lead.status) {
      timelineEntries.push({
        action: 'Status Changed',
        detail: `Status updated from "${lead.status}" to "${status}".`,
        performedBy: req.user._id
      });
    }

    // Track assignment change
    if (req.user.role === 'Admin' && assignedTo && assignedTo !== lead.assignedTo.toString()) {
      const oldAgent = await User.findById(lead.assignedTo);
      const newAgent = await User.findById(assignedTo);
      
      timelineEntries.push({
        action: 'Lead Assigned',
        detail: `Lead assignment changed from "${oldAgent ? oldAgent.name : 'Unassigned'}" to "${newAgent ? newAgent.name : 'Unassigned'}".`,
        performedBy: req.user._id
      });
      lead.assignedTo = assignedTo;
    }

    // Apply values
    lead.name = name;
    lead.email = email || undefined;
    lead.mobileNumbers = formattedNumbers;
    lead.address = address;
    lead.city = city;
    lead.country = country;
    lead.storeName = storeName;
    lead.categories = leadCategories;
    lead.budget = Number(budget) || 0;
    lead.leadSource = leadSource || 'Cold Calling';
    lead.status = status;
    lead.priority = priority;
    lead.notes = notes;
    lead.nextFollowupDate = nextFollowupDate ? new Date(nextFollowupDate) : undefined;
    lead.expectedClosingDate = expectedClosingDate ? new Date(expectedClosingDate) : undefined;

    // Push timeline updates
    if (timelineEntries.length > 0) {
      lead.timeline.push(...timelineEntries);
    } else {
      // General update note if nothing else changed
      lead.timeline.push({
        action: 'Lead Updated',
        detail: `Lead details updated by ${req.user.name}`,
        performedBy: req.user._id
      });
    }

    await lead.save();
    req.session.success_msg = 'Lead details updated successfully.';
    res.redirect(`/leads/view/${id}`);
  } catch (error) {
    console.error('Error updating lead:', error);
    req.session.error_msg = error.message || 'Failed to update lead';
    res.redirect(`/leads/edit/${id}`);
  }
};

// Add quick discussion log/follow-up event from details page
exports.postAddTimelineEvent = async (req, res) => {
  const { id } = req.params;
  const { action, discussion, nextFollowupDate } = req.body;

  try {
    const lead = await Lead.findById(id);
    if (!lead) {
      req.session.error_msg = 'Lead not found';
      return res.redirect('/leads');
    }

    // Check ownership
    if (req.user.role !== 'Admin' && lead.assignedTo.toString() !== req.user._id.toString()) {
      req.session.error_msg = 'You are not authorized to edit this lead';
      return res.redirect('/leads');
    }

    if (!action || !discussion) {
      req.session.error_msg = 'Activity action and discussion text are required';
      return res.redirect(`/leads/view/${id}`);
    }

    // Append event to Lead's timeline
    lead.timeline.push({
      action: action,
      detail: discussion,
      performedBy: req.user._id
    });

    // Create a new separate FollowUp entry
    const newFollowup = new FollowUp({
      leadId: lead._id,
      followupDate: new Date(),
      discussion: discussion,
      nextAction: action,
      nextFollowupDate: nextFollowupDate ? new Date(nextFollowupDate) : undefined,
      createdBy: req.user._id
    });
    await newFollowup.save();

    // If next follow up is provided, update it
    if (nextFollowupDate) {
      lead.nextFollowupDate = new Date(nextFollowupDate);
      
      // Update status to "Follow-up Required" automatically if appropriate
      if (lead.status === 'New Lead' || lead.status === 'Contacted') {
        lead.status = 'Follow-up Required';
        lead.timeline.push({
          action: 'Status Changed',
          detail: 'Status automatically transitioned to "Follow-up Required".',
          performedBy: req.user._id
        });
      }
    }

    await lead.save();
    req.session.success_msg = 'Activity log / follow-up discussion saved.';
    res.redirect(`/leads/view/${id}`);
  } catch (error) {
    console.error('Error logging timeline event:', error);
    req.session.error_msg = 'Failed to record activity';
    res.redirect(`/leads/view/${id}`);
  }
};

// Get Kanban Board view (Phase 5)
exports.getKanbanBoard = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'Admin') {
      query.assignedTo = req.user._id;
    }

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email')
      .sort({ updatedAt: -1 });

    const statuses = [
      "New Lead",
      "Contacted",
      "Interested",
      "Demo Scheduled",
      "Proposal Sent",
      "Negotiation",
      "Ready To Buy",
      "Won",
      "Lost",
      "Not Interested",
      "Follow-up Required"
    ];

    // Initialize board columns
    const board = {};
    statuses.forEach(status => {
      board[status] = [];
    });

    leads.forEach(lead => {
      if (board[lead.status] !== undefined) {
        board[lead.status].push(lead);
      } else {
        board[lead.status] = [lead];
      }
    });

    res.render('leads/kanban', {
      title: 'Leads Kanban Board',
      board,
      statuses
    });
  } catch (error) {
    console.error('Error loading Kanban board:', error);
    req.session.error_msg = 'Failed to load Kanban Board';
    res.redirect('/leads');
  }
};

// Update status via drag-and-drop API
exports.updateLeadStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Authorization check
    if (req.user.role !== 'Admin' && lead.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const oldStatus = lead.status;
    lead.status = status;
    lead.timeline.push({
      action: 'Status Changed',
      detail: `Status updated via Kanban drag-and-drop from "${oldStatus}" to "${status}".`,
      performedBy: req.user._id
    });

    await lead.save();
    return res.json({ success: true, lead });
  } catch (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
