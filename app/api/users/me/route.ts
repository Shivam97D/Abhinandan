import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

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
          role: authUser.user_metadata?.role ?? "pending",
          section: null,
          phone: null,
          supabaseId: authUser.id,
        },
      });
    }

    // Single-device enforcement is done on the client: it compares the token it
    // stored at login (localStorage) against `user.sessionToken` below. The server
    // just reports the current DB token — it never force-logs-out here, so a
    // missing/transient cookie can no longer cause a false logout.
    return NextResponse.json({ user });
  } catch (e) {
    console.error("[GET /api/users/me]", e);
    return NextResponse.json({ user: null });
  }
}
