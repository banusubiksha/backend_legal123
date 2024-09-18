const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const User = require('../models/user');
const cors = require('cors');

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key'; // Use environment variable for secret key

// Enable CORS for all routes
router.use(cors());

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Change this to your desired upload directory
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});

const upload = multer({ storage });

// Sign-up route
router.post('/signup', async (req, res) => {
  console.log('Request Body:', req.body); // Log the request body for debugging

  const { salutation, name, email, phoneNumber, dateOfBirth, address, password } = req.body;

  // Basic validation
  if (!salutation || !name || !email || !phoneNumber || !dateOfBirth || !address || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check if email or phone number already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Email or phone number already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create a new user
    const newUser = new User({
      salutation,
      name,
      email,
      phoneNumber,
      dateOfBirth,
      address,
      password: hashedPassword,
    });

    // Save user to the database
    await newUser.save();

    // Optionally generate a token
    const token = jwt.sign({ userId: newUser._id }, SECRET_KEY, { expiresIn: '1h' });

    // Send success response with token
    res.status(201).json({ message: 'User registered successfully', token });
  } catch (error) {
    console.error('Signup Error:', error); // Enhanced error logging
    res.status(500).json({ error: 'Server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate a token
    const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '1h' });

    // Send success response with token
    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Login Error:', error); // Enhanced error logging
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user data by email route
router.get('/profile', async (req, res) => {
  try {
    // Get the token from headers
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token is required' });
    }

    // Verify token and get user ID
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.userId;

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user data (excluding password)
    res.status(200).json({
      salutation: user.salutation,
      name: user.name,
      email: user.email,
      phone: user.phoneNumber,
      address: user.address,
      dateOfBirth: user.dateOfBirth,
      profilePhoto: user.profilePhoto,
    });
  } catch (error) {
    console.error('Profile Fetch Error:', error); // Enhanced error logging
    res.status(500).json({ error: 'Server error' });
  }
});
router.post('/update-profile-photo', upload.single('profilePhoto'), async (req, res) => {
  try {
    // Get the token from headers
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token is required' });
    }

    // Verify token and get user ID
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.userId;

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update profile photo
    user.profilePhoto = req.file ? req.file.path : user.profilePhoto; // Update if file is uploaded
    await user.save();

    // Send success response
    res.status(200).json({ message: 'Profile photo updated successfully', profilePhoto: user.profilePhoto });
  } catch (error) {
    console.error('Update Profile Photo Error:', error); // Enhanced error logging
    res.status(500).json({ error: 'Server error' });
  }
});

// Save or update user chat details with document upload handling
const ChatUser = require('../models/ChatUser.js'); // Import the new model

// Save or update user chat details with document upload handling
router.post('/save-user-data', upload.single('document'), async (req, res) => {
  try {
    const { name, qualification, phone, dob, about, skills, profilePhoto } = req.body;
    const document = req.file ? req.file.path : '';

    // Basic validation
    if (!name || !qualification || !phone || !dob || !about || !skills) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists by phone
    let chatUser = await ChatUser.findOne({ phone });

    if (chatUser) {
      // Update user if already exists
      chatUser = await ChatUser.findByIdAndUpdate(
        chatUser._id,
        {
          name,
          qualification,
          phone,
          dob,
          about,
          skills: skills.split(','), // Assuming skills are sent as a comma-separated string
          profilePhoto, // Base64-encoded profile photo string or link
          document // Path of the uploaded document, if any
        },
        { new: true }
      );
    } else {
      // Create a new chat user if not exists
      chatUser = new ChatUser({
        name,
        qualification,
        phone,
        dob,
        about,
        skills: skills.split(','), // Store as an array of skills
        profilePhoto, // Base64-encoded profile photo string or link
        document // Path of the uploaded document
      });
      await chatUser.save();
    }

    res.status(200).json({ message: 'User chat data saved successfully', chatUser });
  } catch (error) {
    console.error('Save User Chat Data Error:', error); // Enhanced error logging
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
