const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Count Total Projects
    const projectCount = await db.query(
      'SELECT COUNT(*) FROM projects WHERE user_id = $1', 
      [userId]
    );

    // 2. Count Total Snapshots & Average Score
    // We join tables to ensure we only count snapshots for THIS user's projects
    const snapshotStats = await db.query(
      `SELECT COUNT(s.id) as total_snapshots, AVG(s.ssim_score) as avg_score 
       FROM snapshots s 
       JOIN projects p ON s.project_id = p.id 
       WHERE p.user_id = $1`,
      [userId]
    );

    // 3. Format the data nicely
    const stats = {
      totalProjects: parseInt(projectCount.rows[0].count),
      totalSnapshots: parseInt(snapshotStats.rows[0].total_snapshots),
      averageScore: parseFloat(snapshotStats.rows[0].avg_score || 0).toFixed(2) // Format to 2 decimals (e.g., 0.85)
    };

    res.json(stats);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching stats' });
  }
});

module.exports = router;