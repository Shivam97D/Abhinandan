import { NextRequest, NextResponse } from "next/server";

// Razorpay credentials not yet configured — returns mock order ID
// When credentials are added: uncomment Razorpay SDK block and remove mock
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
    }

    // TODO: activate when Razorpay credentials are configured
    // import Razorpay from "razorpay";
    // const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
    // const order = await razorpay.orders.create({ amount: amount * 100, currency: "INR", receipt: `rcpt_${Date.now()}` });
    // return NextResponse.json({ order });

    const mockOrder = {
      id: `order_${Date.now()}`,
      amount: amount * 100,
      currency: "INR",
      status: "created",
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "RAZORPAY_KEY_ID_PLACEHOLDER",
    };

    return NextResponse.json({ order: mockOrder });
  } catch (e) {
    console.error("[POST /api/payments/razorpay]", e);
    return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 });
  }
}
