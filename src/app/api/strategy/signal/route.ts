import { NextRequest, NextResponse } from "next/server";

async function fetchPythPrice(origin: string, feedId: string): Promise<number | null> {
  const res = await fetch(`${origin}/api/pyth?id=${encodeURIComponent(feedId)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  const feed = Array.isArray(data) ? data[0] : data?.[0];
  const priceData = feed?.price?.price;
  const expo = feed?.price?.expo;
  if (typeof priceData !== "number" || typeof expo !== "number") return null;
  return priceData * Math.pow(10, expo);
}

export async function POST(req: NextRequest) {
  try {
    const origin = req.nextUrl.origin;
    const body = await req.json();
    const feedId = body?.feedId as string | undefined; // Pyth feed ID
    const dexPrice = Number(body?.dexPrice); // DEX quoted price in same units (USD)
    const thresholdBps = Number(body?.thresholdBps ?? 100); // default 1%

    if (!feedId || !Number.isFinite(dexPrice)) {
      return NextResponse.json({ error: "feedId and dexPrice required" }, { status: 400 });
    }

    const pythPrice = await fetchPythPrice(origin, feedId);
    if (!Number.isFinite(pythPrice)) {
      return NextResponse.json({ error: "pyth price unavailable" }, { status: 502 });
    }

    const spread = ((dexPrice - (pythPrice as number)) / (pythPrice as number)) * 10000; // bps
    const shouldExecute = Math.abs(spread) >= thresholdBps;

    return NextResponse.json(
      {
        pythPrice,
        dexPrice,
        spreadBps: spread,
        thresholdBps,
        shouldExecute,
        note: "Replace dexPrice with a real SaucerSwap quote in the next step.",
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
