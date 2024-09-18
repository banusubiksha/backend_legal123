const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Required Fields
  salutation: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true, unique: true },  // Primary contact number (official)
  dateOfBirth: { type: Date, required: true },  // Official date of birth
  address: { type: String, required: true },
  password: { type: String, required: true },

  // ChatScreen related fields (optional for chat profile)
  qualification: { type: String, required: false },  // Optional field for user qualification
  phone: { type: String, required: true },  // Secondary/Alternative contact number (for ChatScreen)
  dob: { type: Date, required: true },  // Date of birth for ChatScreen (might be different from official dateOfBirth)
  about: { type: String, required: false },  // Optional field to store user bio
  skills: { type: [String], required: false },  // Array of skills (optional)
  profilePhoto: { type: String, required: false },  // URL to profile photo (optional)
  document: { type: String, required: false }  // Optional document (e.g., resume or certificate)
});

module.exports = mongoose.model('User', userSchema);
