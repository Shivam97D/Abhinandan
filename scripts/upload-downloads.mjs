import * as dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.DIRECT_URL) {
  console.error("Missing credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const pool = new Pool({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const MAPPING = {
  'snacks_vada_pav': '/Users/admin/Downloads/Vada Pav.jpg',
  'snacks_poha': '/Users/admin/Downloads/pohe .jpg',
  'snacks_upma': '/Users/admin/Downloads/Upma.jpeg',
  'snacks_shira': '/Users/admin/Downloads/shira.jpeg',
  'snacks_khichadi': '/Users/admin/Downloads/shabudana.jpeg',
  'snacks_udid_vada': '/Users/admin/Downloads/udid vada.jpeg'
};

async function main() {
  console.log("Starting upload and mapping of downloads folder images...");

  // Ensure storage bucket exists
  await supabase.storage.createBucket("menu-images", { public: true }).catch(() => {});

  for (const [id, filePath] of Object.entries(MAPPING)) {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath} for item ${id}. Skipping.`);
      continue;
    }

    console.log(`Uploading ${filePath} for item ID: ${id}...`);
    const fileBuffer = fs.readFileSync(filePath);
    const ext = filePath.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `menu/${Date.now()}_${id}.${ext}`;
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filename, fileBuffer, {
        contentType,
        upsert: true
      });

    if (uploadError) {
      console.error(`Upload error for ${id}:`, uploadError.message);
      continue;
    }

    const { data } = supabase.storage.from("menu-images").getPublicUrl(filename);
    const publicUrl = data.publicUrl;
    console.log(`Uploaded successfully. URL: ${publicUrl}`);

    // Update database record
    await prisma.menuItem.update({
      where: { id },
      data: { imageUrl: publicUrl }
    });
    console.log(`Database record updated for ${id}.`);
  }

  console.log("Upload and mapping process complete!");
}

main()
  .catch((e) => {
    console.error("Error running script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
