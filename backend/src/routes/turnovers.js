const express = require('express');
const router = express.Router();
const mondayService = require('../services/mondayService');

router.get('/', async (req, res) => {
  try {
    const turnovers = await mondayService.getTurnovers();
    res.json(turnovers);
  } catch (err) {
    console.error('Error fetching turnovers:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/materials', async (req, res) => {
  try {
    const materials = await mondayService.getMaterials(req.params.id);
    res.json(materials);
  } catch (err) {
    console.error('Error fetching materials:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
