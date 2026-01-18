const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  // 1. Get the token from the header (Format: "Bearer TOKEN_STRING")
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Get just the token part

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // 2. Verify the token
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token.' });
    }
    
    // 3. Save the user info (id, email) into the request object
    req.user = user;
    next(); // Pass control to the next function (the actual route)
  });
}

module.exports = authenticateToken;