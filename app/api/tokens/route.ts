import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { businessDate } from "@/lib/businessDay";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["awaiting_payment", "pending", "preparing", "ready", "served"];

export async function GET() {
  try {
    const settings = await prisma.shopSettings.findUnique({
      where: { id: "default" },
      select: { tokenResetTime: true },
    });
    const today = businessDate(settings?.tokenResetTime ?? "07:00");
    const tokens = await prisma.token.findMany({
      where: { date: today },
      orderBy: { tokenNumber: "asc" },
      take: 200,
      include: {
        order: {
          include: {
            items: { include: { menuItem: true } },
          },
        },
      },
    });
    // Next number to be issued today — lets the POS show the real upcoming token.
    const maxToken = tokens.reduce((m, t) => Math.max(m, t.tokenNumber), 0);
    return NextResponse.json({ tokens, nextTokenNumber: maxToken + 1, businessDate: today });
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
