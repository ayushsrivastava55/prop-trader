import { NextRequest, NextResponse } from "next/server";

// Fetches latest Pyth price update data from Hermes for the provided feed IDs.
// Returns raw updateData[] hex strings, directly usable for IPyth.updatePriceFeeds on EVM chains.
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const ids = url.searchParams.getAll("ids[]");
    const idSingle = url.searchParams.get("id");
    const encoding = (url.searchParams.get("encoding") || "hex").toLowerCase();

    const feedIds = [...ids, ...(idSingle ? [idSingle] : [])];
    if (feedIds.length === 0) {
      return NextResponse.json({ error: "Provide ?id=<feedId> or ?ids[]=<feedId>&ids[]=<feedId2>" }, { status: 400 });
    }

    const qs = new URLSearchParams();
    for (const f of feedIds) qs.append("ids[]", f);
    qs.set("encoding", encoding);

    const hermes = `https://hermes.pyth.network/v2/updates/price/latest?${qs.toString()}`;
    const res = await fetch(hermes, { next: { revalidate: 0 } });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Hermes error: ${text}` }, { status: 502 });
    }
    const data = await res.json();

    // Expect data.binary.data: string[] of hex/base64 update payloads
    const updates: string[] | undefined = data?.binary?.data;
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "No update data returned from Hermes" }, { status: 502 });
    }

    return NextResponse.json({ updateData: updates, source: hermes });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
