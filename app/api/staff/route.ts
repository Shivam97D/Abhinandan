import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { teaEntries: true } } },
    });
    return NextResponse.json({ staff: users });
  } catch (e) {
    console.error("[GET /api/staff]", e);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, username, password, role, section, phone } = body as {
      name: string;
      username: string;
      password: string;
      role: string;
      section?: string;
      phone?: string;
    };

    if (!name || !username || !password || !role) {
      return NextResponse.json({ error: "name, username, password, role required" }, { status: 400 });
    }

    const email = `${username.toLowerCase().trim()}@abhinandan.in`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, name },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        name,
        role: role as "owner" | "section_manager" | "snacks_staff" | "tea_staff",
        phone: phone || null,
        section: section as "tea" | "snacks" | undefined || null,
        supabaseId: authData.user?.id || null,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/staff]", e);
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (user.supabaseId) {
      await supabaseAdmin.auth.admin.deleteUser(user.supabaseId).catch(() => {});
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[DELETE /api/staff]", e);
    return NextResponse.json({ error: "Failed to delete staff" }, { status: 500 });
  }
}
