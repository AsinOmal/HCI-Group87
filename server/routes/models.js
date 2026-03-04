const express = require('express')
const multer = require('multer')
const path = require('path')
const crypto = require('crypto')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    // Generate a unique filename to prevent overwriting
    const uniqueSuffix = crypto.randomBytes(8).toString('hex')
    const ext = path.extname(file.originalname)
    cb(null, `${uniqueSuffix}${ext}`)
  }
})

// Filter to only accept GLTF/GLB files
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()
  if (ext === '.glb' || ext === '.gltf') {
    cb(null, true)
  } else {
    cb(new Error('Only .glb and .gltf files are allowed!'), false)
  }
}

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
})

// POST /api/models/upload
// Accepts multipart/form-data with a 'model' file field
router.post('/upload', authMiddleware, upload.single('model'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No valid custom model file provided.' })
    }

    // Return the URL path where the frontend can fetch the file
    const fileUrl = `/uploads/${req.file.filename}`
    
    res.status(201).json({ 
      message: 'Model uploaded successfully', 
      url: fileUrl 
    })
  } catch (error) {
    console.error('Error uploading custom model:', error)
    res.status(500).json({ error: 'Failed to upload custom model' })
  }
})

module.exports = router
