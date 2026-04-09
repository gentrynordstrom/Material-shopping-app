const { Pool } = require('pg');
const config = require('../config');

let pool = null;

function getPool() {
  if (!pool) {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL is not set. Product catalog features are unavailable.');
    }
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

async function initSchema() {
  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      sku           TEXT,
      store         TEXT NOT NULL,
      url           TEXT UNIQUE,
      price         NUMERIC(10,2),
      image_url     TEXT,
      category      TEXT,
      last_used     TIMESTAMP DEFAULT NOW(),
      times_used    INTEGER DEFAULT 1,
      created_at    TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_products_store ON products(store)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(name gin_trgm_ops)
  `).catch(() => {
    // pg_trgm extension may not be available; fall back to ILIKE search
  });

  console.log('Database schema initialized');
}

function isAvailable() {
  return !!config.databaseUrl;
}

module.exports = { getPool, initSchema, isAvailable };
