const express = require('express');
const cors = require('cors');
const db = require('./db'); 
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const snapshotRoutes = require('./routes/snapshots');
const statsRoutes = require('./routes/stats');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/snapshots', snapshotRoutes);
app.use('/api/stats', statsRoutes);


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