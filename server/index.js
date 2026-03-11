require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const cookieParser = require('cookie-parser')

const path = require('path')

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json({ limit: '10mb' })) // Reduced from 50mb to 10mb for better payload security
app.use(cookieParser())

// Global Rate Limiting (100 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
})
app.use('/api', limiter)

// Serve static uploaded files (like 3D models)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spacio')
  .then(() => console.log('✅ Connected to MongoDB locally (spacio)'))
  .catch(err => console.error('❌ MongoDB connection error:', err))

// Basic Health Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Spacio API is running' })
})

// Routes
const authRoutes = require('./routes/auth')
const designRoutes = require('./routes/designs')
const modelRoutes = require('./routes/models')

app.use('/api/auth', authRoutes)
app.use('/api/designs', designRoutes)
app.use('/api/models', modelRoutes)

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
  })
}

module.exports = app

