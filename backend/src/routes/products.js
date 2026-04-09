const express = require('express');
const router = express.Router();
const { scrapeProduct } = require('../services/productScraper');
const catalogService = require('../services/catalogService');
const mondayService = require('../services/mondayService');
const db = require('../services/db');

router.post('/scrape', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });

    const product = await scrapeProduct(url);

    // Check if this product is already in the catalog
    if (db.isAvailable()) {
      const existing = await catalogService.getProductByUrl(url);
      if (existing) {
        product.name = product.name || existing.name;
        product.sku = product.sku || existing.sku;
        product.price = product.price || parseFloat(existing.price);
        product.image_url = product.image_url || existing.image_url;
        product.catalogId = existing.id;
        product.timesUsed = existing.times_used;
      }
    }

    res.json(product);
  } catch (err) {
    console.error('Error scraping product:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:materialId/product', async (req, res) => {
  try {
    const { materialId } = req.params;
    const { store, name, sku, price, url, image_url } = req.body;

    if (!store || !price) {
      return res.status(400).json({ error: 'store and price are required' });
    }

    // Save to Monday.com
    await mondayService.saveProduct(materialId, {
      store,
      name,
      sku,
      price: parseFloat(price),
      url,
      image_url,
    });

    // Save to catalog database
    let catalogEntry = null;
    if (db.isAvailable() && url) {
      catalogEntry = await catalogService.saveProduct({
        name,
        sku,
        store,
        url,
        price: parseFloat(price),
        image_url,
        category: null,
      });
    }

    res.json({ success: true, catalogEntry });
  } catch (err) {
    console.error('Error saving product:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/catalog/search', async (req, res) => {
  try {
    const { q, store } = req.query;
    if (!q) return res.status(400).json({ error: 'q query param is required' });

    const results = await catalogService.searchCatalog(q, store);
    res.json(results);
  } catch (err) {
    console.error('Error searching catalog:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/catalog/suggestions', async (req, res) => {
  try {
    const { material } = req.query;
    if (!material) return res.json([]);

    const results = await catalogService.getSuggestions(material);
    res.json(results);
  } catch (err) {
    console.error('Error getting suggestions:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
