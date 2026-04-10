const express = require('express');
const { getUsers, getActivityLogs, updateProfile } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, adminOnly, getUsers);
router.put('/profile', protect, updateProfile);
router.get('/logs', protect, adminOnly, getActivityLogs);

module.exports = router;
