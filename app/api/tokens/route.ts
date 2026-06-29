import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["awaiting_payment", "pending", "preparing", "ready", "served"];

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const tokens = await prisma.token.findMany({
      where: { date: today },
      orderBy: { tokenNumber: "asc" },
      take: 100,
      include: {
        order: {
          include: {
            items: { include: { menuItem: true } },
          },
        },
      },
    });
    return NextResponse.json({ tokens });
  } catch (e) {
    console.error("[GET /api/tokens]", e);
    return NextResponse.json({ error: "Failed to fetch tokens" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { tokenId, status, confirmedPaymentMethod } = body;

    if (!tokenId || !status) {
      return NextResponse.json({ error: "tokenId and status are required" }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const token = await prisma.token.update({
      where: { id: tokenId },
      data: { status },
    });

    // When counter confirms payment (awaiting_payment → pending), also update the order
    if (confirmedPaymentMethod && status === "pending") {
      await prisma.order.update({
        where: { id: token.orderId },
        data: {
          status: "confirmed",
          paymentMethod: confirmedPaymentMethod,
        },
      });
    }

    await supabaseAdmin
      .channel("tokens")
      .send({
        type: "broadcast",
        event: "token_update",
        payload: { tokenId, status, tokenNumber: token.tokenNumber },
      })
      .catch(() => {});

    return NextResponse.json({ success: true, token });
  } catch (e) {
    console.error("[PATCH /api/tokens]", e);
    return NextResponse.json({ error: "Failed to update token" }, { status: 500 });
  }
}
