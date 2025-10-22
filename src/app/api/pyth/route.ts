import { NextRequest, NextResponse } from "next/server";

const HERMES_BASE_URL = process.env.NEXT_PUBLIC_HERMES_BASE_URL || "https://hermes.pyth.network";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const url = `${HERMES_BASE_URL}/v2/price_feeds?ids[]=${encodeURIComponent(id)}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      return NextResponse.json({ error: `Hermes error: ${res.status}` }, { status: 502 });
    }
    const data = await res.json();

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
