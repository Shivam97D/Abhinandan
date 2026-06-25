import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const orders = await prisma.order.findMany({
      where: { sessionId: params.sessionId },
      include: {
        items: { include: { menuItem: true } },
        token: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ orders });
  } catch (e) {
    console.error("[GET /api/orders/session/[sessionId]]", e);
    return NextResponse.json({ error: "Failed to fetch session orders" }, { status: 500 });
  }
}
