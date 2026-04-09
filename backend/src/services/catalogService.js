const db = require('./db');

async function saveProduct(product) {
  if (!db.isAvailable()) return null;

  const pool = db.getPool();
  const { name, sku, store, url, price, image_url, category } = product;

  const result = await pool.query(
    `INSERT INTO products (name, sku, store, url, price, image_url, category, last_used, times_used)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 1)
     ON CONFLICT (url) DO UPDATE SET
       name = COALESCE(NULLIF($1, ''), products.name),
       sku = COALESCE(NULLIF($2, ''), products.sku),
       price = COALESCE($5, products.price),
       image_url = COALESCE(NULLIF($6, ''), products.image_url),
       last_used = NOW(),
       times_used = products.times_used + 1
     RETURNING *`,
    [name, sku, store, url, price, image_url, category]
  );

  return result.rows[0];
}

async function searchCatalog(query, store) {
  if (!db.isAvailable()) return [];

  const pool = db.getPool();
  const params = [`%${query}%`];
  let storeFilter = '';

  if (store) {
    storeFilter = ' AND store = $2';
    params.push(store);
  }

  const result = await pool.query(
    `SELECT * FROM products
     WHERE (name ILIKE $1 OR sku ILIKE $1)${storeFilter}
     ORDER BY times_used DESC, last_used DESC
     LIMIT 20`,
    params
  );

  return result.rows;
}

async function getSuggestions(materialName) {
  if (!db.isAvailable() || !materialName) return [];

  const pool = db.getPool();

  // Split material name into keywords, search for products matching any
  const keywords = materialName
    .toLowerCase()
    .split(/[\s,\-\/]+/)
    .filter((w) => w.length > 2);

  if (keywords.length === 0) return [];

  // Build an OR query matching any keyword
  const conditions = keywords.map((_, i) => `name ILIKE $${i + 1}`);
  const params = keywords.map((k) => `%${k}%`);

  const result = await pool.query(
    `SELECT *, (
       ${keywords.map((_, i) => `CASE WHEN name ILIKE $${i + 1} THEN 1 ELSE 0 END`).join(' + ')}
     ) AS relevance
     FROM products
     WHERE ${conditions.join(' OR ')}
     ORDER BY relevance DESC, times_used DESC, last_used DESC
     LIMIT 10`,
    params
  );

  return result.rows;
}

async function getProduct(id) {
  if (!db.isAvailable()) return null;

  const pool = db.getPool();
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function getProductByUrl(url) {
  if (!db.isAvailable()) return null;

  const pool = db.getPool();
  const result = await pool.query('SELECT * FROM products WHERE url = $1', [url]);
  return result.rows[0] || null;
}

module.exports = {
  saveProduct,
  searchCatalog,
  getSuggestions,
  getProduct,
  getProductByUrl,
};
