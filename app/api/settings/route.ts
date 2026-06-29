import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "default";

// GET — return singleton settings row (upsert default if missing)
export async function GET() {
  try {
    const settings = await prisma.shopSettings.upsert({
      where: { id: SETTINGS_ID },
      update: {},
      create: { id: SETTINGS_ID },
    });
    return NextResponse.json({ settings });
  } catch (e) {
    console.error("[GET /api/settings]", e);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// PUT — update settings
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    // Build a safe, typed payload
    const data = {
      ...(body.shopName            !== undefined && { shopName:            String(body.shopName) }),
      ...(body.location            !== undefined && { location:            String(body.location) }),
      ...(body.phone               !== undefined && { phone:               String(body.phone) }),
      ...(body.email               !== undefined && { email:               String(body.email) }),
      ...(body.gstNumber           !== undefined && { gstNumber:           String(body.gstNumber) }),
      ...(body.fssaiNumber         !== undefined && { fssaiNumber:         String(body.fssaiNumber) }),
      ...(body.website             !== undefined && { website:             String(body.website) }),
      ...(body.upiId               !== undefined && { upiId:               String(body.upiId) }),
      ...(body.upiMerchantName     !== undefined && { upiMerchantName:     String(body.upiMerchantName) }),
      ...(body.teaPricePerCup      !== undefined && { teaPricePerCup:      parseFloat(String(body.teaPricePerCup)) || 12 }),
      ...(body.morningStart        !== undefined && { morningStart:        String(body.morningStart) }),
      ...(body.morningEnd          !== undefined && { morningEnd:          String(body.morningEnd) }),
      ...(body.eveningStart        !== undefined && { eveningStart:        String(body.eveningStart) }),
      ...(body.eveningEnd          !== undefined && { eveningEnd:          String(body.eveningEnd) }),
      ...(body.tokenResetTime      !== undefined && { tokenResetTime:      String(body.tokenResetTime) }),
      ...(body.smsOnTokenReady     !== undefined && { smsOnTokenReady:     Boolean(body.smsOnTokenReady) }),
      ...(body.dailyReportWhatsapp !== undefined && { dailyReportWhatsapp: Boolean(body.dailyReportWhatsapp) }),
      ...(body.manualUpiConfirm    !== undefined && { manualUpiConfirm:    Boolean(body.manualUpiConfirm) }),
    };

    const settings = await prisma.shopSettings.upsert({
      where: { id: SETTINGS_ID },
      update: data,
      create: { id: SETTINGS_ID, ...data },
    });

    return NextResponse.json({ settings });
  } catch (e) {
    console.error("[PUT /api/settings]", e);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
