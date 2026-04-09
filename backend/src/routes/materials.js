const express = require('express');
const router = express.Router();
const mondayService = require('../services/mondayService');

router.put('/:id/price', async (req, res) => {
  try {
    const { store, price, productUrl } = req.body;
    if (!store || price === undefined) {
      return res.status(400).json({ error: 'store and price are required' });
    }
    if (!['menards', 'homedepot'].includes(store)) {
      return res.status(400).json({ error: 'store must be "menards" or "homedepot"' });
    }

    const result = await mondayService.savePrice(
      req.params.id,
      store,
      parseFloat(price),
      productUrl
    );
    res.json(result);
  } catch (err) {
    console.error('Error saving price:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
