import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Razorpay credentials not yet configured — creates a pending order in DB with a mock Razorpay ID
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { amount, items, mobile } = body as {
    amount: number;
    items: { id: string; qty: number; price: number }[];
    mobile?: string;
  };

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Valid amount required" }, { status: 400 });
  }

  try {
    const mockRazorpayOrderId = `TMP-${Date.now()}`;
    const total = items?.reduce((s, i) => s + i.price * i.qty, 0) ?? amount;

    const order = await prisma.order.create({
      data: {
        source: "customer",
        status: "pending",
        total,
        mobile: mobile || null,
        items: items?.length
          ? {
              create: items.map((i) => ({
                menuItemId: i.id,
                qty: i.qty,
                price: i.price,
              })),
            }
          : undefined,
        payment: {
          create: {
            razorpayOrderId: mockRazorpayOrderId,
            status: "pending",
            amount: total,
          },
        },
      },
      include: { payment: true },
    });

    console.log("[create-order] pending order created", { orderId: order.id, mockRazorpayOrderId, total });

    return NextResponse.json({
      orderId: mockRazorpayOrderId,
      dbOrderId: order.id,
      amount: Math.round(amount * 100),
      currency: "INR",
    });
  } catch (e) {
    console.error("[POST /api/payments/create-order]", e);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
