import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await prisma.menuItem.findMany({
      orderBy: [{ section: "asc" }, { category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ items }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string };
    console.error("[GET /api/menu]", e);
    return NextResponse.json({ error: "Failed to fetch menu", detail: err?.message, code: err?.code }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, price, category, section, imageUrl } = body;

    if (!name || !price || !category || !section) {
      return NextResponse.json({ error: "name, price, category, section required" }, { status: 400 });
    }

    const item = await prisma.menuItem.create({
      data: {
        name: name.trim(),
        price: Number(price),
        category: category.trim(),
        section,
        imageUrl: imageUrl || null,
        available: true,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/menu]", e);
    return NextResponse.json({ error: "Failed to create menu item" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, available, price, name, category, section, imageUrl } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(available !== undefined ? { available } : {}),
        ...(price !== undefined ? { price: Number(price) } : {}),
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(category !== undefined ? { category: category.trim() } : {}),
        ...(section !== undefined ? { section } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (e) {
    console.error("[PATCH /api/menu]", e);
    return NextResponse.json({ error: "Failed to update menu item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.menuItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[DELETE /api/menu]", e);
    return NextResponse.json({ error: "Failed to delete menu item" }, { status: 500 });
  }
}
