const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const leadRoutes = require('./routes/leadRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For dev, allow all. Adjust for production
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Pass io to routes by storing it in app locals
app.set('io', io);

// Log connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/users', userRoutes);

// Connect to DB
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rsproperty';

const startServer = async () => {
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    let uri = MONGO_URI;
    
    if (uri.includes('127.0.0.1') || uri.includes('localhost')) {
      console.log('Using in-memory MongoDB Server for instant development!');
      const mongod = await MongoMemoryServer.create();
      uri = mongod.getUri();
    }
    
    await mongoose.connect(uri);
    console.log('Connected to Database');
    
    // Seed default users with static MongoDB IDs so JWT tokens survive nodemon restarts!
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    const adminExists = await User.findOne({ email: 'admin@rsproperty.com' });
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash('password123', salt);

    if (!adminExists) {
      await User.create({ _id: new mongoose.Types.ObjectId("600000000000000000000001"), name: 'Super Admin', email: 'admin@rsproperty.com', password_hash, role: 'Admin' });
      console.log('Default admin seeded: admin@rsproperty.com / password123');
    }

    const johnExists = await User.findOne({ email: 'john@rsproperty.com' });
    if (!johnExists) {
      await User.create({ _id: new mongoose.Types.ObjectId("600000000000000000000002"), name: 'John Agent', email: 'john@rsproperty.com', password_hash, role: 'Team Member' });
      console.log('Team Member seeded: john@rsproperty.com');
    }

    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('Waiting for mongodb-memory-server installation...');
    } else {
      console.error('Database connection error:', error);
    }
  }
};

startServer();
