const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { protect } = require('../middleware/authMiddleware');

// Protect all lead routes
router.use(protect);

// Lead CRUD routes
router.get('/', leadController.getLeads);

router.get('/kanban', leadController.getKanbanBoard);
router.post('/update-status/:id', leadController.updateLeadStatus);

router.get('/add', leadController.getAddLead);
router.post('/add', leadController.postAddLead);

router.get('/view/:id', leadController.getLeadDetails);

router.get('/edit/:id', leadController.getEditLead);
router.post('/edit/:id', leadController.postEditLead);

// Timeline log endpoint
router.post('/timeline/:id', leadController.postAddTimelineEvent);

// Quick notes update endpoint
router.post('/view/:id/notes', leadController.postUpdateNotes);

module.exports = router;
