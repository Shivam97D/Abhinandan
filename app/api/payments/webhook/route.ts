import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "PLACEHOLDER_WEBHOOK_SECRET";

async function getNextTokenNumber(date: string): Promise<number> {
  const last = await prisma.token.findFirst({
    where: { date },
    orderBy: { tokenNumber: "desc" },
    select: { tokenNumber: true },
  });
  return (last?.tokenNumber ?? 0) + 1;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const expectedSig = crypto
      .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSig !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event === "payment.captured") {
      const { order_id, id: paymentId, amount } = event.payload.payment.entity;

      // Update payment record
      const payment = await prisma.payment.updateMany({
        where: { razorpayOrderId: order_id },
        data: { razorpayPaymentId: paymentId, status: "captured" },
      });

      if (payment.count === 0) {
        console.warn(`[webhook] No payment found for razorpayOrderId=${order_id}`);
        return NextResponse.json({ received: true });
      }

      // Confirm order
      const paymentRecord = await prisma.payment.findFirst({ where: { razorpayOrderId: order_id } });
      if (paymentRecord) {
        await prisma.order.update({
          where: { id: paymentRecord.orderId },
          data: { status: "confirmed", paymentMethod: "upi" },
        });

        // Generate token
        const today = new Date().toISOString().split("T")[0];
        const tokenNumber = await getNextTokenNumber(today);
        const token = await prisma.token.create({
          data: { orderId: paymentRecord.orderId, tokenNumber, date: today, status: "pending" },
        });

        // Update order with tokenNumber
        await prisma.order.update({
          where: { id: paymentRecord.orderId },
          data: { tokenNumber },
        });

        // Broadcast via Realtime
        await supabaseAdmin
          .channel("tokens")
          .send({ type: "broadcast", event: "new_token", payload: { tokenId: token.id, tokenNumber, orderId: paymentRecord.orderId } })
          .catch(() => {});

        console.log(`[webhook] payment.captured: ₹${amount / 100}, token #${tokenNumber}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("[POST /api/payments/webhook]", e);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
