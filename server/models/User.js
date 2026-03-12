const mongoose = require('mongoose')

// The bare minimum schema we need for now.
// We can add "name" or other fields later if we want!
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  }
}, { timestamps: true })

module.exports = mongoose.model('User', userSchema)
