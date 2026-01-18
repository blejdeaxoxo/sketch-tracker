const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/authenticateToken');
const upload = require('../middleware/upload');

// 1. GET ALL PROJECTS (Protected Route)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Only get projects belonging to the logged-in user
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

// 2. CREATE NEW PROJECT (Protected + Image Upload)
// 'image' is the key name the frontend must use when sending the file
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  const { title, category } = req.body;
  const imagePath = req.file ? req.file.path : null; // Get the path where multer saved the file

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

// 3. GET SINGLE PROJECT (with Snapshots)
router.get('/:id', authenticateToken, async (req, res) => {
  const projectId = req.params.id;

  try {
    // A. Get Project Details (Security check: make sure it belongs to user)
    const projectQuery = await db.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, req.user.id]
    );

    if (projectQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // B. Get all Snapshots for this project
    const snapshotsQuery = await db.query(
      'SELECT * FROM snapshots WHERE project_id = $1 ORDER BY created_at ASC',
      [projectId]
    );

    // C. Combine them into one response
    const projectData = projectQuery.rows[0];
    projectData.snapshots = snapshotsQuery.rows; // Add snapshots array to the object

    res.json(projectData);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;