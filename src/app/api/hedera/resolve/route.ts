import { NextRequest, NextResponse } from "next/server";

const MIRROR = "https://testnet.mirrornode.hedera.com/api/v1";

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const id = url.searchParams.get("id"); // Hedera 0.0.x or EVM 0x…
    const symbol = url.searchParams.get("symbol");
    const name = url.searchParams.get("name");
    const q = url.searchParams.get("q"); // free text, prefers symbol
    const limit = Number(url.searchParams.get("limit") || 10);

    // Resolve a single id to EVM address (contract or token)
    if (id) {
      if (id.startsWith("0x") && id.length === 42) {
        return NextResponse.json({ evm_address: id, id: null });
      }
      // try contracts
      try {
        const c = await fetchJson(`${MIRROR}/contracts/${id}`);
        if (c?.evm_address) return NextResponse.json({ evm_address: c.evm_address, id });
      } catch {}
      // try tokens
      try {
        const t = await fetchJson(`${MIRROR}/tokens/${id}`);
        if (t?.evm_address)
          return NextResponse.json({ evm_address: t.evm_address, id, symbol: t.symbol, name: t.name, decimals: t.decimals });
      } catch {}
      return NextResponse.json({ error: `Unable to resolve id ${id}` }, { status: 404 });
    }

    // Search tokens by symbol/name
    const params = new URLSearchParams();
    if (q) params.set("symbol", q);
    if (symbol) params.set("symbol", symbol);
    if (name) params.set("name", name);
    params.set("limit", String(limit));

    const list = await fetchJson(`${MIRROR}/tokens?${params.toString()}`);
    const tokens = (list?.tokens || []).map((t: any) => ({
      id: t.token_id,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      evm_address: t.evm_address,
      type: t.type,
    }));
    return NextResponse.json(tokens);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
