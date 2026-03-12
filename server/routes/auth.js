const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { z } = require('zod')
const User = require('../models/User')

const authSchema = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
})

const router = express.Router()


const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret'

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user._id, email: user.email },
    JWT_SECRET,
    { expiresIn: '15m' }
  )
  const refreshToken = jwt.sign(
    { userId: user._id, email: user.email },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )
  return { accessToken, refreshToken }
}

const sendRefreshTokenCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  })
}

// ── REGISTER ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const validationResult = authSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error.errors[0].message })
    }
    const { email, password } = validationResult.data

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already taken' })
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Save the user
    const newUser = new User({ email, password: hashedPassword })
    await newUser.save()

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(newUser)
    sendRefreshTokenCookie(res, refreshToken)

    res.status(201).json({ token: accessToken, email: newUser.email })

  } catch (error) {
    console.error('Registration Error:', error)
    res.status(500).json({ error: 'Server error during registration' })
  }
})

// ── LOGIN ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const validationResult = authSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({ error: validationResult.error.errors[0].message })
    }
    const { email, password } = validationResult.data

    // Find the user
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Compare the provided password with the hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(user)
    sendRefreshTokenCookie(res, refreshToken)

    res.status(200).json({ token: accessToken, email: user.email })

  } catch (error) {
    console.error('Login Error:', error)
    res.status(500).json({ error: 'Server error during login' })
  }
})

// ── REFRESH TOKEN ─────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' })
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET)
    
    // Check if user still exists in DB
    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' })
    }

    // Generate NEW tokens
    const tokens = generateTokens(user)
    sendRefreshTokenCookie(res, tokens.refreshToken)

    // Return the new short-lived access token
    res.status(200).json({ token: tokens.accessToken })
    
  } catch (error) {
    console.error('Refresh Error:', error)
    return res.status(403).json({ error: 'Invalid or expired refresh token' })
  }
})

// ── LOGOUT ────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  // Clear the HttpOnly cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  })
  res.status(200).json({ message: 'Successfully logged out' })
})

module.exports = router
