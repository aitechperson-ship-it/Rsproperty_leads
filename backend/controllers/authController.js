const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const userCount = await User.countDocuments();
    const assignedRole = userCount === 0 ? 'Admin' : (role || 'Team Member');

    const user = await User.create({ name, email, password_hash, role: assignedRole });
    if (user) {
      res.status(201).json({ _id: user.id, name: user.name, email: user.email, role: user.role, profile_picture: user.profile_picture, token: generateToken(user.id) });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && user.password_hash && (await bcrypt.compare(password, user.password_hash))) {
      res.json({ _id: user.id, name: user.name, email: user.email, role: user.role, profile_picture: user.profile_picture, token: generateToken(user.id) });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.googleLogin = async (req, res) => {
  const { credential } = req.body;
  try {
    // Disable client ID verification just in case it's not setup correctly during local test
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;
    
    let user = await User.findOne({ email });
    if (!user) {
      const userCount = await User.countDocuments();
      const assignedRole = userCount === 0 ? 'Admin' : 'Team Member';
      // Create new user if not exists
      user = await User.create({ name, email, auth_type: 'google', role: assignedRole, profile_picture: picture });
    } else if (picture && user.profile_picture !== picture) {
      user.profile_picture = picture;
      await user.save();
    }
    
    res.json({ _id: user.id, name: user.name, email: user.email, role: user.role, profile_picture: user.profile_picture, token: generateToken(user.id) });
  } catch (error) {
    res.status(401).json({ message: 'Google authentication failed', error: error.message });
  }
};
