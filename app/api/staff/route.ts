import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const [users, { data: authData }] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { teaEntries: true } } },
      }),
      supabaseAdmin.auth.admin.listUsers({ perPage: 200 }),
    ]);

    const authUsers = authData?.users ?? [];

    // Augment DB users with their email from Supabase Auth
    const staff = users.map((u) => {
      const authUser = u.supabaseId ? authUsers.find((a) => a.id === u.supabaseId) : null;
      return { ...u, email: authUser?.email ?? null };
    });

    // Auth users with NO matching DB record — pending role assignment
    const dbIds = new Set(users.map((u) => u.supabaseId).filter(Boolean));
    const pendingUsers = authUsers
      .filter((a) => !dbIds.has(a.id))
      .map((a) => ({
        supabaseId: a.id,
        email: a.email ?? null,
        name: (a.user_metadata?.name as string) ?? a.email?.split("@")[0] ?? "Unknown",
        role: (a.user_metadata?.role as string) ?? null,
        createdAt: a.created_at,
      }));

    return NextResponse.json({ staff, pendingUsers });
  } catch (e) {
    console.error("[GET /api/staff]", e);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, username, password, role, section, phone, supabaseId } = body as {
      name: string;
      username?: string;
      password?: string;
      role: string;
      section?: string;
      phone?: string;
      supabaseId?: string; // assign existing auth user
    };

    if (!name || !role) {
      return NextResponse.json({ error: "name and role required" }, { status: 400 });
    }

    let resolvedSupabaseId = supabaseId ?? null;

    // New user path: create Supabase Auth account
    if (!supabaseId) {
      if (!username || !password) {
        return NextResponse.json({ error: "username and password required for new accounts" }, { status: 400 });
      }
      const email = `${username.toLowerCase().trim()}@abhinandan.in`;
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role, name },
      });
      if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
      resolvedSupabaseId = authData.user?.id ?? null;
    } else {
      // Update the existing auth user's metadata
      await supabaseAdmin.auth.admin.updateUserById(supabaseId, {
        user_metadata: { role, name },
      }).catch(() => {});
    }

    const user = await prisma.user.create({
      data: {
        name,
        role: role as "owner" | "section_manager" | "snacks_staff" | "tea_staff",
        phone: phone || null,
        section: (section as "tea" | "snacks") || null,
        supabaseId: resolvedSupabaseId,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/staff]", e);
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, role, section, phone, name } = body as {
      id: string;
      role?: string;
      section?: string | null;
      phone?: string | null;
      name?: string;
    };

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(role ? { role: role as "owner" | "section_manager" | "snacks_staff" | "tea_staff" } : {}),
        ...(section !== undefined ? { section: (section as "tea" | "snacks") || null } : {}),
        ...(phone !== undefined ? { phone: phone || null } : {}),
        ...(name ? { name } : {}),
      },
    });

    // Sync role to Supabase Auth metadata
    if (role && user.supabaseId) {
      await supabaseAdmin.auth.admin.updateUserById(user.supabaseId, {
        user_metadata: { role, name: user.name },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, user });
  } catch (e) {
    console.error("[PATCH /api/staff]", e);
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
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
