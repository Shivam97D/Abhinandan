import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";

async function getNextTokenNumber(date: string): Promise<number> {
  const last = await prisma.token.findFirst({
    where: { date },
    orderBy: { tokenNumber: "desc" },
    select: { tokenNumber: true },
  });
  return (last?.tokenNumber ?? 0) + 1;
}

// POST /api/orders/counter — POS counter order placement
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, paymentMethod = "cash", mobile } = body;

    if (!items || !items.length) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    const total = items.reduce(
      (s: number, i: { price: number; qty: number }) => s + i.price * i.qty,
      0
    );
    const today = new Date().toISOString().split("T")[0];
    const tokenNumber = await getNextTokenNumber(today);

    const isCounterPending = paymentMethod === "counter_pending";
    const tokenStatus = isCounterPending ? "awaiting_payment" : "pending";

    const order = await prisma.order.create({
      data: {
        source: "counter",
        status: "pending",
        total,
        paymentMethod: isCounterPending ? null : paymentMethod,
        mobile: mobile || null,
        tokenNumber,
        items: {
          create: items.map((i: { id: string; qty: number; price: number }) => ({
            menuItemId: i.id,
            qty: i.qty,
            price: i.price,
          })),
        },
        token: {
          create: {
            tokenNumber,
            date: today,
            status: tokenStatus,
          },
        },
      },
      include: {
        token: true,
        items: { include: { menuItem: true } },
      },
    });

    await supabaseAdmin
      .channel("tokens")
      .send({
        type: "broadcast",
        event: "new_order",
        payload: {
          tokenId: order.token?.id,
          tokenNumber,
          orderId: order.id,
          status: tokenStatus,
          total,
          paymentMethod: isCounterPending ? null : paymentMethod,
          items: order.items.map((it) => ({
            id: it.id,
            name: it.menuItem?.name ?? "Item",
            qty: it.qty,
            price: it.price,
          })),
        },
      })
      .catch(() => {});

    return NextResponse.json(
      {
        order: {
          id: order.id,
          tokenNumber: order.tokenNumber,
          tokenId: order.token?.id,
          total: order.total,
          status: order.status,
          tokenStatus,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[POST /api/orders/counter]", e);
    return NextResponse.json({ error: "Failed to create counter order" }, { status: 500 });
  }
}
