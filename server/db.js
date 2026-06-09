import pg from 'pg';
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

/** Create tables if they don't exist */
export async function initDB() {
  await pool.query(`
    -- Single-row table holding all site JSON data
    CREATE TABLE IF NOT EXISTS site_data (
      id      INTEGER PRIMARY KEY DEFAULT 1,
      data    JSONB   NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Image asset registry (uploaded via Cloudinary)
    CREATE TABLE IF NOT EXISTS images (
      id         SERIAL PRIMARY KEY,
      public_id  VARCHAR(300) UNIQUE NOT NULL,
      url        TEXT NOT NULL,
      thumb_url  TEXT,
      work_id    VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅  DB tables ready');
}

/** Return stored site data or null */
export async function getSiteData() {
  const r = await pool.query('SELECT data FROM site_data WHERE id = 1');
  return r.rows[0]?.data ?? null;
}

/** Upsert site data */
export async function setSiteData(data) {
  await pool.query(`
    INSERT INTO site_data (id, data, updated_at)
    VALUES (1, $1, NOW())
    ON CONFLICT (id) DO UPDATE
      SET data = EXCLUDED.data, updated_at = NOW()
  `, [JSON.stringify(data)]);
}
