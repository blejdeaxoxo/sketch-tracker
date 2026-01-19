const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/authenticateToken');
const upload = require('../middleware/upload');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC', 
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  const { title, category } = req.body;
  const imagePath = req.file ? req.file.path : null;

  if (!title || !imagePath) {
    return res.status(400).json({ error: 'Title and Reference Image are required' });
  }

  try {
    const newProject = await db.query(
      'INSERT INTO projects (user_id, title, category, reference_image_path) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, title, category, imagePath]
    );

    res.status(201).json(newProject.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  const projectId = req.params.id;

  try {
    const projectQuery = await db.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, req.user.id]
    );

    if (projectQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const snapshotsQuery = await db.query(
      'SELECT * FROM snapshots WHERE project_id = $1 ORDER BY created_at ASC',
      [projectId]
    );

    const projectData = projectQuery.rows[0];
    projectData.snapshots = snapshotsQuery.rows;

    res.json(projectData);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;