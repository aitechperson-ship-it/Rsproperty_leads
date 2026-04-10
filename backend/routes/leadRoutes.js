const express = require('express');
const { getLeads, createLead, updateLead, addNote, exportLeads, getStats, deleteLead, getTeamStats } = require('../controllers/leadController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(protect, getLeads)
  .post(protect, adminOnly, createLead); // Only admin creates new leads

router.get('/export', protect, exportLeads);
router.get('/stats', protect, adminOnly, getStats);
router.get('/team-stats', protect, adminOnly, getTeamStats);

router.route('/:id')
  .put(protect, updateLead)
  .delete(protect, adminOnly, deleteLead);

router.post('/:id/notes', protect, addNote);

module.exports = router;
