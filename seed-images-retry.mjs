#!/usr/bin/env node
// Retries only the 14 failed items with verified-working Unsplash photo IDs

import { createClient } from '@supabase/supabase-js';
import https from 'https';
import http from 'http';
import { Buffer } from 'buffer';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wimekinohemsmqybqknc.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error("Error: SUPABASE_SERVICE_ROLE_KEY is required.");
  process.exit(1);
}
const LOCAL_API    = 'http://localhost:3000/api/menu';
const BUCKET       = 'menu-images';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── Only the 14 that failed, mapped to VERIFIED 200 photo IDs ───────────────
// All IDs below were confirmed returning HTTP 200 before this script was written.
const RETRY_MAP = {
  // Elaichi Chai → warm golden chai in cup (verified 200)
  'tea_elaichi_chai':               '1544145945-f90425340c7e',
  // Lemon Tea → use green tea variant (clear light tea, verified 200)
  'tea_lemon_tea':                  '1556679343-c7306c1976bc',
  // Upma → food bowl / semolina breakfast (verified 200)
  'snacks_upma':                    '1565299585323-38d6b0865b47',
  // Thepla → Indian flatbread / roti — bhakri image works (verified 200)
  'snacks_thepla':                  '1585937421612-70a008356fbe',
  // Sheera → sweet halwa — use warm food plate (verified 200)
  'cmqtjcqo60003iesocv48dgsc':      '1504674900247-0877df9cc836',
  // Kachori → fried ball snack — reuse batata vada (verified 200)
  'snacks_kachori':                 '1601050690597-df0568f70950',
  // Bread Omelette → egg on bread — use warm food plate (verified 200)
  'snacks_bread_omelette':          '1484723091739-30a097e8f929',
  // Pudachi Wadi → stuffed colocasia roll — use spring roll image (verified 200)
  'snacks_pudachi_wadi':            '1563379926898-05f4575a45d8',
  // Paneer Roll → kathi roll — reuse cheese roll (verified 200)
  'snacks_paneer_roll':             '1565299624946-b28f40a0ae38',
  // Cheese Sandwich → grilled sandwich — use food plate (verified 200)
  'cmqtjcqk20002iesonpcistqy':      '1504674900247-0877df9cc836',
  // Chivda → dry namkeen mix — use general snack (verified 200)
  'snacks_chivda':                  '1484723091739-30a097e8f929',
  // Farsan → dry Gujarati snack — use food plate (verified 200)
  'snacks_farsan':                  '1565299585323-38d6b0865b47',
  // Cold Coffee → iced blended coffee (verified 200)
  'cmqtjcqq90004iesobwtg2gvh':      '1534040385115-33dcb3acba5b',
  // Mango Shake → mango fruit drink (verified 200)
  'cmqtjcqs30005iesow14ikcwe':      '1553279768-865429fa0078',
};

function download(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function uploadAndUpdate(itemId, photoId, itemName) {
  const url = `https://images.unsplash.com/photo-${photoId}?w=600&h=480&fit=crop&auto=format&q=85`;
  try {
    process.stdout.write(`  ↓ [${itemName}] …`);
    const { buffer } = await download(url);
    process.stdout.write(` ${Math.round(buffer.length / 1024)}KB`);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(`menu/${itemId}.jpg`, buffer, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(`menu/${itemId}.jpg`);

    const res = await fetch(LOCAL_API, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId, imageUrl: publicUrl }),
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    console.log(` ✓`);
    return true;
  } catch (e) {
    console.log(` ✗ ${e.message}`);
    return false;
  }
}

async function getMenuNames() {
  try {
    const res = await fetch(LOCAL_API);
    const data = await res.json();
    return Object.fromEntries((data.items || []).map(i => [i.id, i.name]));
  } catch { return {}; }
}

async function main() {
  console.log('\n🔄  Retrying 14 failed items with verified photo IDs...\n');
  const names = await getMenuNames();
  let ok = 0, fail = 0;
  for (const [id, photoId] of Object.entries(RETRY_MAP)) {
    const name = names[id] || id;
    const success = await uploadAndUpdate(id, photoId, name);
    if (success) ok++; else fail++;
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`\n✅  Done: ${ok} succeeded, ${fail} failed.\n`);
}

main().catch(console.error);
