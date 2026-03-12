const mongoose = require('mongoose')

const designSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    default: 'Untitled Design'
  },
  thumbnail: {
    type: String,
    required: false,
  },
  

  room: {
    width: { type: Number, required: true },
    length: { type: Number, required: true },
    shape: { type: String, enum: ['Rectangle', 'L-Shape', 'Square', 'Custom'], required: true },
    floorColor: { type: String, required: true },
    wallColor: { type: String, required: true },
    customPolygon: [{
      x: Number,
      y: Number
    }]
  },


  furniture: [{
    id: String,
    type: { type: String }, // Workaround for Mongoose 'type' keyword
    color: String,
    material: String,
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    rotation: Number,
    scale: Number,
  }]
}, { timestamps: true })

module.exports = mongoose.model('Design', designSchema)
