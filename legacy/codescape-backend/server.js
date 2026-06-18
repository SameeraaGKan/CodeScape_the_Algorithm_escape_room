// ============================================
// FILE 2: server.js (Main server file)
// ============================================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

// Security middleware
app.use(helmet());

// Rate limiting - prevent spam registrations
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS - allow your frontend to connect
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// DATABASE CONNECTION
// ============================================
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codescape', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

connectDB();

// ============================================
// PARTICIPANT MODEL
// ============================================
const participantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  teamSize: {
    type: Number,
    required: [true, 'Team size is required'],
    min: [1, 'Team size must be at least 1'],
    max: [10, 'Team size cannot exceed 10']
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['registered', 'confirmed', 'cancelled'],
    default: 'registered'
  }
}, {
  timestamps: true
});

const Participant = mongoose.model('Participant', participantSchema);

// ============================================
// ROUTES
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CodeScape Backend is running!',
    timestamp: new Date().toISOString()
  });
});

// Get all participants (for the participant list)
app.get('/api/participants', async (req, res) => {
  try {
    const participants = await Participant.find({ status: 'registered' })
      .select('name email teamSize registrationDate')
      .sort({ registrationDate: -1 });
    
    res.json({
      success: true,
      count: participants.length,
      data: participants
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching participants'
    });
  }
});

// Register a new participant
app.post('/api/participants', async (req, res) => {
  try {
    const { name, email, teamSize } = req.body;

    // Check if email already exists
    const existingParticipant = await Participant.findOne({ email: email.toLowerCase() });
    if (existingParticipant) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered!'
      });
    }

    // Create new participant
    const participant = new Participant({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      teamSize: parseInt(teamSize)
    });

    await participant.save();

    res.status(201).json({
      success: true,
      message: `Thank you, ${participant.name}! Your team of ${participant.teamSize} is registered.`,
      data: {
        id: participant._id,
        name: participant.name,
        email: participant.email,
        teamSize: participant.teamSize,
        registrationDate: participant.registrationDate
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

// Get participant stats (for admin/dashboard later)
app.get('/api/stats', async (req, res) => {
  try {
    const totalParticipants = await Participant.countDocuments({ status: 'registered' });
    const totalTeamMembers = await Participant.aggregate([
      { $match: { status: 'registered' } },
      { $group: { _id: null, total: { $sum: '$teamSize' } } }
    ]);

    const averageTeamSize = totalParticipants > 0 ? 
      (totalTeamMembers[0]?.total || 0) / totalParticipants : 0;

    res.json({
      success: true,
      data: {
        totalParticipants,
        totalTeamMembers: totalTeamMembers[0]?.total || 0,
        averageTeamSize: Math.round(averageTeamSize * 10) / 10
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
});

// Handle 404s
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`
🚀 CodeScape Backend Server is running!
📍 Port: ${PORT}
🌐 Environment: ${process.env.NODE_ENV || 'development'}
📊 Database: ${process.env.MONGODB_URI ? 'MongoDB Atlas' : 'Local MongoDB'}
⏰ Started at: ${new Date().toLocaleString()}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

// contributions towards forks are not counted towards the green attendance
// new contribution?