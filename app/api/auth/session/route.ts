import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = authUser.user_metadata?.role || "owner";

    // Only owners (except developer admin) are restricted to single-device
    const isExempt = authUser.email === "admin@abhinandan.in";

    let sessionToken = null;

    if (role === "owner" && !isExempt) {
      // Generate a new random session token
      sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

      // Update the user record in Prisma
      await prisma.user.update({
        where: { supabaseId: authUser.id },
        data: { sessionToken },
      });
    }

    return NextResponse.json({ success: true, sessionToken });
  } catch (e) {
    console.error("[POST /api/auth/session]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
