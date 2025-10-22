"use client";
import { useState } from "react";
import { useStrategyStore } from "@/store/strategy";
import { PYTH_FEEDS } from "@/lib/pyth";

const FEEDS = [
  { id: PYTH_FEEDS.ETH_USD, label: "ETH / USD" },
  { id: PYTH_FEEDS.BTC_USD, label: "BTC / USD" },
  { id: PYTH_FEEDS.USDC_USD, label: "USDC / USD" },
];

export default function SignalTester() {
  const { arbitrage } = useStrategyStore();
  const [feedId, setFeedId] = useState(FEEDS[0]!.id);
  // DEX quote inputs
  const [router, setRouter] = useState("");
  const [tokenIn, setTokenIn] = useState("");
  const [tokenOut, setTokenOut] = useState("");
  const [decimalsIn, setDecimalsIn] = useState(6);
  const [decimalsOut, setDecimalsOut] = useState(18);
  const [amountIn, setAmountIn] = useState(100); // e.g., 100 USDC
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onTest() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // 1) Get real DEX quote
      const q = await fetch("/api/dex/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          router,
          tokenIn,
          tokenOut,
          amountIn,
          decimalsIn,
          decimalsOut,
        }),
      });
      const qData = await q.json();
      if (!q.ok) throw new Error(qData?.error || "Quote failed");

      // Compute dexPrice in USD (assuming tokenIn is USD stable) => USD per tokenOut
      const dexPrice = Number(qData.amountIn) / Number(qData.amountOut);

      // 2) Compute signal against Pyth
      const res = await fetch("/api/strategy/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedId, dexPrice, thresholdBps: arbitrage.spreadBps }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Signal failed");
      setResult({ ...data, dexPriceComputed: dexPrice, quote: qData });
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Signal Tester</h3>
        <span className="text-xs text-muted-foreground">Real SaucerSwap-style quote vs Pyth</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-sm">
          <div className="mb-1 text-muted-foreground">Feed</div>
          <select
            className="w-full rounded-md border px-2 py-1"
            value={feedId}
            onChange={(e) => setFeedId(e.target.value)}
          >
            {FEEDS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm" title="SaucerSwap Router address on Hedera testnet">
          <div className="mb-1 text-muted-foreground">Router</div>
          <input className="w-full rounded-md border px-2 py-1" value={router} onChange={(e) => setRouter(e.target.value)} />
        </label>
        <label className="block text-sm" title="Token In (e.g. USDC)">
          <div className="mb-1 text-muted-foreground">Token In</div>
          <input className="w-full rounded-md border px-2 py-1" value={tokenIn} onChange={(e) => setTokenIn(e.target.value)} />
        </label>
        <label className="block text-sm" title="Token Out (e.g. WETH/WHBAR)">
          <div className="mb-1 text-muted-foreground">Token Out</div>
          <input className="w-full rounded-md border px-2 py-1" value={tokenOut} onChange={(e) => setTokenOut(e.target.value)} />
        </label>
        <label className="block text-sm" title="Decimals for Token In">
          <div className="mb-1 text-muted-foreground">Decimals In</div>
          <input type="number" className="w-full rounded-md border px-2 py-1" value={decimalsIn} onChange={(e) => setDecimalsIn(Number(e.target.value))} />
        </label>
        <label className="block text-sm" title="Decimals for Token Out">
          <div className="mb-1 text-muted-foreground">Decimals Out</div>
          <input type="number" className="w-full rounded-md border px-2 py-1" value={decimalsOut} onChange={(e) => setDecimalsOut(Number(e.target.value))} />
        </label>
        <label className="block text-sm" title="Amount of Token In to quote (e.g., 100 USDC)">
          <div className="mb-1 text-muted-foreground">Amount In</div>
          <input type="number" className="w-full rounded-md border px-2 py-1" value={amountIn} onChange={(e) => setAmountIn(Number(e.target.value))} />
        </label>
        <div className="flex items-end">
          <button
            onClick={onTest}
            disabled={
              loading || !router || !tokenIn || !tokenOut || !Number.isFinite(amountIn) || amountIn <= 0
            }
            className="px-3 py-2 rounded-md border text-sm hover:bg-accent w-full"
          >
            {loading ? "Testing…" : "Compute Signal"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <div className="text-sm">
          <div>PYTH: {Number(result.pythPrice).toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
          <div>DEX amountOut: {Number(result.quote?.amountOut).toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
          <div>DEX price (USD per out): {Number(result.dexPriceComputed).toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
          <div>Spread: {(Number(result.spreadBps) / 100).toFixed(2)}%</div>
          <div>Threshold: {(Number(result.thresholdBps) / 100).toFixed(2)}%</div>
          <div className={result.shouldExecute ? "text-green-600" : "text-muted-foreground"}>
            {result.shouldExecute ? "Action: Execute" : "Action: No Trade"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{result.note}</div>
        </div>
      )}
    </div>
  );
}
