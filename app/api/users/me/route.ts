import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findFirst({
      where: { supabaseId: authUser.id },
      select: { id: true, name: true, role: true, section: true, phone: true, supabaseId: true, sessionToken: true },
    });

    if (!user) {
      // Fallback: return auth user metadata
      return NextResponse.json({
        user: {
          id: authUser.id,
          name: authUser.user_metadata?.name ?? authUser.email?.split("@")[0] ?? "Staff",
          role: authUser.user_metadata?.role ?? "owner",
          section: null,
          phone: null,
          supabaseId: authUser.id,
        },
      });
    }

    // Verify single-device owner session
    if (user.role === "owner" && authUser.email !== "admin@abhinandan.in") {
      const activeCookieToken = cookies().get("owner_session_token")?.value;
      if (!activeCookieToken || activeCookieToken !== user.sessionToken) {
        console.warn(`[Session Mismatch] User: ${authUser.email}. Active: ${user.sessionToken}, Cookie: ${activeCookieToken}`);
        return NextResponse.json({ user: null, sessionMismatch: true });
      }
    }

    return NextResponse.json({ user });
  } catch (e) {
    console.error("[GET /api/users/me]", e);
    return NextResponse.json({ user: null });
  }
}
