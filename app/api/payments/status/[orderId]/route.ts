import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const { orderId } = params;

  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  try {
    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId: orderId },
      include: { order: { include: { token: true } } },
    });

    if (!payment) {
      return NextResponse.json({ status: "pending" });
    }

    return NextResponse.json({
      status: payment.status,
      tokenNumber: payment.order?.token?.tokenNumber ?? null,
      tokenId: payment.order?.token?.id ?? null,
    });
  } catch (e) {
    console.error("[GET /api/payments/status]", e);
    return NextResponse.json({ status: "pending" });
  }
}
