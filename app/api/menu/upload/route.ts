import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, WebP or GIF allowed" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure bucket exists
    await supabaseAdmin.storage.createBucket("menu-images", { public: true }).catch(() => {});

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `menu/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("menu-images")
      .upload(filename, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error("[upload]", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from("menu-images").getPublicUrl(filename);
    return NextResponse.json({ url: data.publicUrl });
  } catch (e) {
    console.error("[POST /api/menu/upload]", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
