import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getNextTokenNumber(date: string): Promise<number> {
  const last = await prisma.token.findFirst({
    where: { date },
    orderBy: { tokenNumber: "desc" },
    select: { tokenNumber: true },
  });
  return (last?.tokenNumber ?? 0) + 1;
}

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: { include: { menuItem: true } },
        token: true,
        payment: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ orders });
  } catch (e) {
    console.error("[GET /api/orders]", e);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, source = "counter", paymentMethod = "cash", mobile, sessionId } = body;

    if (!items || !items.length) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    const total = items.reduce(
      (s: number, i: { price: number; qty: number }) => s + i.price * i.qty,
      0
    );
    const today = new Date().toISOString().split("T")[0];
    const tokenNumber = await getNextTokenNumber(today);

    // Fetch manual UPI confirmation setting
    const settings = await prisma.shopSettings.findUnique({
      where: { id: "default" },
    });
    const manualUpiConfirm = settings?.manualUpiConfirm ?? true;

    // counter_pending = customer walked to counter, counter staff confirms payment later
    // awaiting_payment token status signals the counter queue to show "confirm payment" button
    const isCounterPending = paymentMethod === "counter_pending";
    const isUpiPending = paymentMethod === "upi" && manualUpiConfirm;
    const tokenStatus = (isCounterPending || isUpiPending) ? "awaiting_payment" : "pending";


    const order = await prisma.order.create({
      data: {
        source,
        status: "pending",
        total,
        paymentMethod: isCounterPending ? null : paymentMethod,
        mobile: mobile || null,
        tokenNumber,
        sessionId: sessionId || null,
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

    // Broadcast new order with full item details so counter queue renders immediately
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
    console.error("[POST /api/orders]", e);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
