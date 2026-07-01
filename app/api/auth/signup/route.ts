import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Public staff self-signup. Creates a Supabase auth account with role "pending"
// and NO database User row, so it surfaces in the owner's Staff → Pending list
// for role assignment. A pending account has no access until the owner assigns a role.
export async function POST(req: NextRequest) {
  try {
    const { name, username, password } = await req.json();

    if (!name || !username || !password) {
      return NextResponse.json({ error: "Name, username and password are required" }, { status: 400 });
    }
    const uname = String(username).toLowerCase().trim();
    if (!/^[a-z0-9_]{3,20}$/.test(uname)) {
      return NextResponse.json({ error: "Username must be 3–20 letters, numbers or underscores" }, { status: 400 });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const email = `${uname}@abhinandan.in`;
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: String(password),
      email_confirm: true,
      user_metadata: { name: String(name).trim(), role: "pending" },
    });

    if (error) {
      const msg = /already|registered|exists/i.test(error.message)
        ? "That username is already taken"
        : error.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[POST /api/auth/signup]", e);
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }
}
