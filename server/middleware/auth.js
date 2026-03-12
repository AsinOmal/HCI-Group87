const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET

const authMiddleware = (req, res, next) => {
  // Extract token from Header: "Authorization: Bearer <token>"
  const authHeader = req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token, authorization denied' })
  }

  const token = authHeader.split(' ')[1]

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET)
    
    // Attach the user payload to the request object so subsequent routes can use it
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' })
  }
}

module.exports = authMiddleware
