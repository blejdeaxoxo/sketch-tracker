const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/authenticateToken');
const upload = require('../middleware/upload');
const getSimilarityScore = require('../utils/compareImages');

// POST: Add a new Snapshot
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  const { project_id, luminosity_index } = req.body;
  const snapshotPath = req.file ? req.file.path : null;

  if (!snapshotPath || !project_id) {
    return res.status(400).json({ error: 'Snapshot image and Project ID are required' });
  }

  try {
    // 1. Get the Reference Image path for this project
    const projectResult = await db.query('SELECT reference_image_path FROM projects WHERE id = $1', [project_id]);
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const referencePath = projectResult.rows[0].reference_image_path;

    // 2. Calculate Similarity Score (The AI part!)
    const ssimScore = await getSimilarityScore(referencePath, snapshotPath);

    // 3. Save to Database
    const newSnapshot = await db.query(
      'INSERT INTO snapshots (project_id, image_path, ssim_score, luminosity_index) VALUES ($1, $2, $3, $4) RETURNING *',
      [project_id, snapshotPath, ssimScore, luminosity_index || 0]
    );

    res.status(201).json(newSnapshot.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error processing snapshot' });
  }
});

// GET: Get all snapshots for a specific project
router.get('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await db.query(
      'SELECT * FROM snapshots WHERE project_id = $1 ORDER BY created_at ASC',
      [projectId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;