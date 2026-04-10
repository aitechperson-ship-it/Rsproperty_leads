const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

exports.getUsers = async (req, res) => {
  try {
    // Only return team members for assignment
    const users = await User.find({ role: 'Team Member' }).select('-password_hash');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
   try {
     const { name } = req.body;
     const user = await User.findById(req.user.id);
     if (user) {
       user.name = name || user.name;
       const updatedUser = await user.save();
       res.json({ _id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role });
     } else {
       res.status(404).json({ message: 'User not found' });
     }
   } catch(error) {
     res.status(400).json({ message: error.message });
   }
}

exports.getActivityLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find().populate('user_id', 'name').populate('lead_id', 'customer_name').sort({ timestamp: -1 }).limit(50);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
