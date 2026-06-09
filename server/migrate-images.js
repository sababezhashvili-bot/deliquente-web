/**
 * migrate-images.js
 * ─────────────────
 * One-time script: uploads all local ./images/*.jpg files to Cloudinary
 * and updates the site_data JSON so every work.img points to a CDN URL.
 *
 * Run ONCE after first deploy:
 *   cd server
 *   cp .env.example .env   # fill in real values
 *   npm install
 *   node migrate-images.js
 */

import 'dotenv/config';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { pool, initDB, getSiteData, setSiteData } from './db.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const IMAGES_DIR = resolve('../images');

async function uploadFile(filePath, filename) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(filePath, {
      folder: 'deliquente',
      public_id: filename.replace(/\.[^.]+$/, ''), // strip extension
      overwrite: false, // skip if already exists
      eager: [{
        quality: 'auto:good',
        fetch_format: 'auto',
        width: 2400, height: 2400, crop: 'limit',
      }],
    }, (err, result) => {
      if (err) reject(err); else resolve(result);
    });
  });
}

async function run() {
  await initDB();

  const files = readdirSync(IMAGES_DIR)
    .filter(f => /\.(jpg|jpeg|png|webp|tiff?)$/i.test(f));

  console.log(`Found ${files.length} images to migrate…\n`);

  // Build a map: original filename → Cloudinary URL
  const urlMap = {};
  for (const file of files) {
    const filePath = join(IMAGES_DIR, file);
    try {
      const result = await uploadFile(filePath, file);
      const url = result.eager?.[0]?.secure_url ?? result.secure_url;
      urlMap[`images/${file}`] = url;
      console.log(`✅  ${file} → ${url.slice(0, 80)}…`);
    } catch (err) {
      console.error(`❌  ${file}: ${err.message}`);
    }
  }

  console.log('\nUpdating site_data works.img URLs…');
  const data = await getSiteData();
  if (!data) {
    console.warn('No site_data found in DB yet — push the site from the admin panel first, then re-run.');
    process.exit(0);
  }

  let changed = 0;
  for (const w of data.works ?? []) {
    if (urlMap[w.img]) {
      w.img = urlMap[w.img];
      changed++;
    }
  }

  await setSiteData(data);
  console.log(`\n✅  Updated ${changed} work image URLs in the database.`);
  console.log('Migration complete — your images are now served from Cloudinary CDN.');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
