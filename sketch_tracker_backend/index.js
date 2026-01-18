const express = require('express');
const cors = require('cors');
const db = require('./db'); // Import our database connection
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const snapshotRoutes = require('./routes/snapshots');
const statsRoutes = require('./routes/stats');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow requests from other devices (like your phone)
app.use(express.json()); // Allow the server to read JSON data

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/snapshots', snapshotRoutes);
app.use('/api/stats', statsRoutes);

// IMPORTANT: Make the 'uploads' folder public so the app can see images
// Access images via: http://YOUR_PC_IP:3000/uploads/filename.jpg
app.use('/uploads', express.static('uploads'));

// Test Route 1: Check if Server is running
app.get('/', (req, res) => {
  res.send('Sketch Tracker API is running!');
});

// Test Route 2: Check if Database is connected
app.get('/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ message: 'Database Connected Successfully', time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Start the Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});