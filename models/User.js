// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  contacts_given: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('User', userSchema);
