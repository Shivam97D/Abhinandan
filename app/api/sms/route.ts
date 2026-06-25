import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const SMS_SECRET = process.env.SMS_FORWARDER_SECRET || "PLACEHOLDER_SMS_SECRET";

const UPI_CREDIT_PATTERNS = [
  /credited\s+with\s+(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{2})?)/i,
  /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{2})?)\s+credited/i,
  /received\s+(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{2})?)/i,
  /UPI[-/]CR[/\s]+([\d,]+(?:\.\d{2})?)/i,
  /deposited\s+(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{2})?)/i,
];

function parseUpiAmount(smsBody: string): number | null {
  for (const pattern of UPI_CREDIT_PATTERNS) {
    const m = smsBody.match(pattern);
    if (m?.[1]) {
      const amount = parseFloat(m[1].replace(/,/g, ""));
      if (!isNaN(amount) && amount > 0) return amount;
    }
  }
  return null;
}

function isTeaPayment(amount: number): boolean {
  return amount >= 12 && amount % 12 === 0;
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-sms-signature");
  const rawBody = await req.text();

  if (SMS_SECRET !== "PLACEHOLDER_SMS_SECRET") {
    const expected = crypto.createHmac("sha256", SMS_SECRET).update(rawBody).digest("hex");
    if (signature !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: { sender?: string; body?: string; timestamp?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sender = "", body: smsBody = "", timestamp } = payload;
  const bankSenderPattern = /^[A-Z]{2}-[A-Z]+$|^[A-Z0-9]{6,}$/;
  const isBank = bankSenderPattern.test(sender);
  const amount = parseUpiAmount(smsBody);

  console.log("[sms] received", { sender, isBank, amount, timestamp });

  if (!isBank || amount === null) {
    return NextResponse.json({ received: true, action: "ignored", reason: "not a bank UPI credit SMS" });
  }

  const cups = isTeaPayment(amount) ? amount / 12 : 0;

  if (cups > 0) {
    const today = new Date().toISOString().split("T")[0];
    const hour = new Date().getHours();
    const shift = hour < 14 ? "morning" : "evening";

    await prisma.teaQuickEntry.create({
      data: {
        cups,
        amount,
        source: "sms_auto",
        shift,
        date: today,
        note: `Auto from SMS: ${smsBody.slice(0, 80)}`,
      },
    });

    console.log(`[sms] AUTO-TEA ₹${amount} → ${cups} cup(s), shift=${shift}`);
    return NextResponse.json({
      received: true,
      action: "tea_order_created",
      amount,
      cups,
      shift,
      timestamp: timestamp || new Date().toISOString(),
    });
  }

  console.log(`[sms] non-tea UPI credit ₹${amount} — logged for review`);
  return NextResponse.json({
    received: true,
    action: "logged",
    reason: `₹${amount} is not a multiple of ₹12`,
    amount,
  });
}
