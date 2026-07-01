import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { businessDate } from "@/lib/businessDay";

export async function GET(
  _req: NextRequest,
  { params }: { params: { tokenNumber: string } }
) {
  try {
    const settings = await prisma.shopSettings.findUnique({
      where: { id: "default" },
      select: { tokenResetTime: true },
    });
    const today = businessDate(settings?.tokenResetTime ?? "07:00");
    const num = parseInt(params.tokenNumber, 10);

    if (isNaN(num)) {
      return NextResponse.json({ error: "Invalid token number" }, { status: 400 });
    }

    const token = await prisma.token.findUnique({
      where: { date_tokenNumber: { date: today, tokenNumber: num } },
      include: {
        order: {
          include: {
            items: { include: { menuItem: true } },
          },
        },
      },
    });

    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    return NextResponse.json({ token });
  } catch (e) {
    console.error("[GET /api/tokens/by-number/[tokenNumber]]", e);
    return NextResponse.json({ error: "Failed to fetch token" }, { status: 500 });
  }
}
