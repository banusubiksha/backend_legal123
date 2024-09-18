// models/ChatUser.js

const mongoose = require('mongoose');

const chatUserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  qualification: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  dob: { type: Date, required: true },
  about: { type: String, required: true },
  skills: { type: [String], required: true },
  profilePhoto: { type: String, required: false }, // Optional
  document: { type: String, required: false } // Optional
});

module.exports = mongoose.model('ChatUser', chatUserSchema);
