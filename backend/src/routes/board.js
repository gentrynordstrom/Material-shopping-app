const express = require('express');
const router = express.Router();
const mondayService = require('../services/mondayService');

router.get('/columns', async (req, res) => {
  try {
    const columns = await mondayService.getSubitemBoardColumns();
    res.json(columns);
  } catch (err) {
    console.error('Error fetching columns:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/groups', async (req, res) => {
  try {
    const groups = await mondayService.getGroups();
    res.json(groups);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/setup-price-columns', async (req, res) => {
  try {
    const result = await mondayService.ensurePriceColumns();
    res.json(result);
  } catch (err) {
    console.error('Error setting up price columns:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
