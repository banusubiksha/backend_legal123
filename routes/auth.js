const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const User = require('../models/user');

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key'; // Use environment variable for secret key

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
    console.error(error);
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
    console.error(error);
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
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save or update user chat details
router.post('/save-user-data', async (req, res) => {
  const { name, qualification, phone, dob, about, skills, profilePhoto, document } = req.body;

  // Basic validation
  if (!name || !qualification || !phone || !dob || !about || !skills) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check if user exists by phone
    let user = await User.findOne({ phone });
    if (user) {
      // Update user if already exists
      user = await User.findByIdAndUpdate(user._id, {
        name,
        qualification,
        phone,
        dob,
        about,
        skills,
        profilePhoto,
        document,
      }, { new: true });
    } else {
      // Create a new user if not exists
      user = new User({
        name,
        qualification,
        phone,
        dob,
        about,
        skills,
        profilePhoto,
        document,
      });
      await user.save();
    }

    res.status(200).json({ message: 'User data saved successfully', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload profile photo route
router.post('/upload-photo', upload.single('profilePhoto'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token is required' });
    }

    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.userId;

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update the user with the new profile photo
    user.profilePhoto = req.file.path;
    await user.save();

    res.status(200).json({ message: 'Profile photo updated successfully', profilePhoto: req.file.path });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
