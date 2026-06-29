#!/usr/bin/env node
// Re-seeds ALL menu images with curated, relevant Unsplash photos
// Run: node seed-images.mjs
// Requires .env.local in project root OR set env vars manually

import { createClient } from '@supabase/supabase-js';
import https from 'https';
import http from 'http';
import { Buffer } from 'buffer';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || 'https://wimekinohemsmqybqknc.supabase.co';
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error("Error: SUPABASE_SERVICE_ROLE_KEY is required.");
  process.exit(1);
}
const LOCAL_API     = 'http://localhost:3000/api/menu';
const BUCKET        = 'menu-images';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── Curated photo map ── item-id → Unsplash photo-id ─────────────────────────
// Each photo is chosen specifically for that Indian food/drink item.
const PHOTO_MAP = {

  // ── TEA ──────────────────────────────────────────────────────────────────────
  // Cutting Chai — small glass of masala cutting chai, classic Pune street style
  'tea_cutting_chai':               '1576092768241-dec231879fc3',
  // Adrak Chai — ginger tea with visible ginger
  'tea_adrak_chai':                 '1544787219-7f47ccb76574',
  // Masala Chai — spiced chai with star anise, cloves
  'tea_masala_chai':                '1561047029-3000c68339ca',
  // Elaichi Chai — cardamom chai, golden colour in cup
  'tea_elaichi_chai':               '1571934811356-5cc061b6d808',
  // Special Chai — premium chai with cream top
  'tea_special_chai':               '1559496417-e7f25cb247f3',
  // Black Tea — dark plain tea, no milk
  'tea_black_tea':                  '1571091718767-18b5b1457add',
  // Green Tea — pale green tea in glass
  'tea_green_tea':                  '1556679343-c7306c1976bc',
  // Lemon Tea — tea with lemon slice
  'tea_lemon_tea':                  '1571072966434-0b90944b43c4',
  // Ginger Tea (cuid item)
  'cmqtjcqyx0006ieso8zxne2cf':      '1580489944761-15a19d654956',
  // Kadak Special Tea (cuid item) — strong dark brew
  'cmqtjcr3f0007ieso3f7fs1wk':      '1544787219-7f47ccb76574',
  // Filter Coffee — South Indian filter coffee in dabara set
  'cmqtjcr6b0008iesoh3u4n53f':      '1509042239860-f550ce710b93',

  // ── SNACKS — Breakfast ───────────────────────────────────────────────────────
  // Poha — flattened rice with onion, tempered yellow, Pune breakfast
  'snacks_poha':                    '1567188040759-fb8a883dc6d8',
  // Kande Pohe — same dish, alternate name
  'cmqtjcq9w0000iesoat0khdrz':      '1567188040759-fb8a883dc6d8',
  // Upma — semolina upma with curry leaves, South Indian breakfast
  'snacks_upma':                    '1567337710282-87b3f3e5e75b',
  // Thepla — Gujarati flatbread, green from methi
  'snacks_thepla':                  '1574082595292-3e8dc9eba1e3',
  // Sheera — yellow halwa / sooji sheera, puja prasad style
  'cmqtjcqo60003iesocv48dgsc':      '1605792547282-bae1e89e90ae',

  // ── SNACKS — Fried / Street ──────────────────────────────────────────────────
  // Vada Pav — the Pune staple, bun with batata vada
  'snacks_vada_pav':                '1606755962773-d324e0a13086',
  // Batata Vada — standalone potato fritter
  'snacks_batata_vada':             '1601050690597-df0568f70950',
  // Batata Wada (duplicate item, same image)
  'cmqtjcqff0001ieso6vk36qkt':      '1601050690597-df0568f70950',
  // Samosa — triangle samosa with chutneys
  'snacks_samosa':                  '1601050690597-df0568f70950',
  // Kachori — round stuffed fried kachori
  'snacks_kachori':                 '1643375738774-61ef89ca54b1',
  // Misal Pav — spicy sprouts curry with pav, farsan topping
  'snacks_misal_pav':               '1589301760014-d929f3979dbc',
  // Pav Bhaji — thick vegetable bhaji with butter pav
  'snacks_pav_bhaji':               '1606491956689-2ea866880c84',
  // Bread Omelette — egg omelette sandwiched in bread, street style
  'snacks_bread_omelette':          '1525518392674-39ba8fde73ba',
  // Bhakri Pithla — sorghum bhakri with gram flour pithla
  'snacks_bhakri_pithla':           '1585937421612-70a008356fbe',
  // Pudachi Wadi — steamed colocasia leaf rolls
  'snacks_pudachi_wadi':            '1559523279-0c29e2b1bdd7',

  // ── SNACKS — Rolls ───────────────────────────────────────────────────────────
  // Cheese Roll — golden crispy roll with melted cheese
  'snacks_cheese_roll':             '1565299624946-b28f40a0ae38',
  // Paneer Roll — stuffed paneer kathi roll
  'snacks_paneer_roll':             '1574484284774-d55d5da23e2a',
  // Pav Bhaji Roll — bhaji stuffed in roll wrap
  'snacks_pav_bhaji_roll':          '1631452180519-c014fe946bc7',
  // Spring Roll — crispy Chinese-style spring roll with dip
  'snacks_spring_roll':             '1563379926898-05f4575a45d8',

  // ── SNACKS — Sandwich ────────────────────────────────────────────────────────
  // Cheese Sandwich — grilled cheese sandwich, toasted
  'cmqtjcqk20002iesonpcistqy':      '1528735602780-2552fd06c7c8',

  // ── SNACKS — Namkeen / Dry ───────────────────────────────────────────────────
  // Chivda — flattened rice mixture namkeen
  'snacks_chivda':                  '1599974551562-f01f3b66ec63',
  // Farsan — Gujarati mixed farsan / sev mixture
  'snacks_farsan':                  '1599974551562-f01f3b66ec63',

  // ── DRINKS ───────────────────────────────────────────────────────────────────
  // Cold Coffee — iced blended coffee with cream
  'cmqtjcqq90004iesobwtg2gvh':      '1461023058000-9be5f9b97d58',
  // Mango Shake — thick mango milkshake, bright yellow
  'cmqtjcqs30005iesow14ikcwe':      '1546173159-9d1f33a1f3e3',
};

// ─── Download helper (follows redirects) ─────────────────────────────────────
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
      res.on('end', () => resolve({
        buffer: Buffer.concat(chunks),
        contentType: res.headers['content-type'] || 'image/jpeg',
      }));
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ─── Upload to Supabase + update DB ──────────────────────────────────────────
async function uploadAndUpdate(itemId, photoId, itemName) {
  const unsplashUrl =
    `https://images.unsplash.com/photo-${photoId}?w=600&h=480&fit=crop&auto=format&q=85`;

  try {
    process.stdout.write(`  ↓ [${itemName}] downloading…`);
    const { buffer } = await download(unsplashUrl);
    process.stdout.write(` ${Math.round(buffer.length / 1024)}KB`);

    const filename = `menu/${itemId}.jpg`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, { contentType: 'image/jpeg', upsert: true });

    if (upErr) throw upErr;

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename);

    // Update via local API
    const patchRes = await fetch(LOCAL_API, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId, imageUrl: publicUrl }),
    });
    const patchData = await patchRes.json();
    if (patchData.error) throw new Error(patchData.error);

    console.log(` ✓`);
    return true;
  } catch (e) {
    console.log(` ✗ ${e.message}`);
    return false;
  }
}

// ─── Fetch current menu to get name mapping ───────────────────────────────────
async function getMenuNames() {
  try {
    const res = await fetch(LOCAL_API);
    const data = await res.json();
    const items = data.items || data || [];
    return Object.fromEntries(items.map(i => [i.id, i.name]));
  } catch {
    return {};
  }
}

async function main() {
  console.log('\n🍵  Abhinandan Menu Image Seeder\n');
  const names = await getMenuNames();
  const entries = Object.entries(PHOTO_MAP);
  console.log(`Updating ${entries.length} items...\n`);

  let ok = 0, fail = 0;
  for (const [itemId, photoId] of entries) {
    const name = names[itemId] || itemId;
    const success = await uploadAndUpdate(itemId, photoId, name);
    if (success) ok++; else fail++;
    await new Promise(r => setTimeout(r, 500)); // rate limit friendly
  }

  console.log(`\n✅  Done: ${ok} succeeded, ${fail} failed.\n`);
  if (fail > 0) console.log('Re-run to retry failed items.');
}

main().catch(console.error);
