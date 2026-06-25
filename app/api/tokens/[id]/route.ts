import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await prisma.token.findUnique({
      where: { id: params.id },
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
    console.error("[GET /api/tokens/[id]]", e);
    return NextResponse.json({ error: "Failed to fetch token" }, { status: 500 });
  }
}
