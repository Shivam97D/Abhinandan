import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shift, entries, staffId } = body as {
      shift: "morning" | "evening";
      entries: { itemId: string; qty: number; price: number }[];
      staffId?: string;
    };

    if (!entries || !shift) {
      return NextResponse.json({ error: "shift and entries are required" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    const saved = await prisma.$transaction(
      entries.map((e) =>
        prisma.teaQuickEntry.create({
          data: {
            cups: e.qty,
            amount: e.price * e.qty,
            shift,
            date: today,
            source: "manual",
            itemId: e.itemId || null,
            staffId: staffId || null,
          },
        })
      )
    );

    const totalRevenue = entries.reduce((s, e) => s + e.price * e.qty, 0);
    const totalCups = entries.reduce((s, e) => s + e.qty, 0);

    return NextResponse.json({
      success: true,
      message: `Saved ${saved.length} entries for ${shift} shift`,
      totalRevenue,
      totalCups,
    });
  } catch (e) {
    console.error("[POST /api/tea-entry]", e);
    return NextResponse.json({ error: "Failed to save tea entry" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const entries = await prisma.teaQuickEntry.findMany({
      where: { date: today },
      include: { menuItem: true, staff: true },
      orderBy: { createdAt: "desc" },
    });

    // Group by shift for display
    const grouped = entries.reduce(
      (acc, e) => {
        const key = e.shift;
        if (!acc[key]) acc[key] = { shift: key, cups: 0, amount: 0, entries: [] };
        acc[key].cups += e.cups;
        acc[key].amount += e.amount ?? 0;
        acc[key].entries.push(e);
        return acc;
      },
      {} as Record<string, { shift: string; cups: number; amount: number; entries: typeof entries }>
    );

    return NextResponse.json({ history: Object.values(grouped), raw: entries });
  } catch (e) {
    console.error("[GET /api/tea-entry]", e);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
