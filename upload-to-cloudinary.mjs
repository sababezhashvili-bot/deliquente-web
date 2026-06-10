/**
 * upload-to-cloudinary.mjs
 * ─────────────────────────
 * ლოკალური images/ საქაღალდის ყველა სურათი Cloudinary-ზე ტვირთავს
 * და გამოაქვს JSON mapping: { "images/Bed.jpg": "https://res.cloudinary.com/..." }
 *
 * გაშვება:
 *   node upload-to-cloudinary.mjs
 */

import { v2 as cloudinary } from 'cloudinary';
import { readdirSync } from 'fs';
import { join, resolve } from 'path';
import { readFile } from 'fs/promises';

// ─── Cloudinary credentials ───────────────────────────────────────────────────
const CLOUD_NAME   = 'dvytkqzbc';
const API_KEY      = '726482216975338';
const API_SECRET   = process.env.CLOUDINARY_API_SECRET; // set via env variable

if (!API_SECRET) {
  console.error('❌  Set CLOUDINARY_API_SECRET environment variable first!');
  console.error('    Windows CMD:  set CLOUDINARY_API_SECRET=yourSecret');
  console.error('    Windows PS:   $env:CLOUDINARY_API_SECRET="yourSecret"');
  process.exit(1);
}

cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET });

const IMAGES_DIR = resolve('./images');
const FOLDER     = 'deliquente';

// ─── Upload one file ──────────────────────────────────────────────────────────
function uploadFile(filePath, publicId) {
  return new Promise((res, rej) => {
    cloudinary.uploader.upload(filePath, {
      folder: FOLDER,
      public_id: publicId,
      overwrite: false,
      resource_type: 'image',
      eager: [{
        quality: 'auto:good',
        fetch_format: 'auto',
        width: 2400, height: 2400, crop: 'limit',
      }],
    }, (err, result) => err ? rej(err) : res(result));
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const files = readdirSync(IMAGES_DIR)
  .filter(f => /\.(jpe?g|png|webp|tiff?)$/i.test(f));

console.log(`\n📂  Found ${files.length} images — uploading to Cloudinary…\n`);

const urlMap = {};

for (const file of files) {
  const filePath = join(IMAGES_DIR, file);
  const publicId = file.replace(/\.[^.]+$/, ''); // strip extension
  try {
    process.stdout.write(`  ↑ ${file} … `);
    const result = await uploadFile(filePath, publicId);
    // prefer the eager (optimised WebP) URL, fall back to original
    const url = result.eager?.[0]?.secure_url ?? result.secure_url;
    urlMap[`images/${file}`] = url;
    console.log('✅');
  } catch (err) {
    console.log(`❌  ${err.message}`);
  }
}

console.log('\n\n═══════════════════════════════════════════════════════════');
console.log('✅  Upload complete!  Copy the mapping below:\n');
console.log(JSON.stringify(urlMap, null, 2));
console.log('\n═══════════════════════════════════════════════════════════');
console.log('\n💾  Also saved to: cloudinary-urls.json');

import { writeFileSync } from 'fs';
writeFileSync('./cloudinary-urls.json', JSON.stringify(urlMap, null, 2));
