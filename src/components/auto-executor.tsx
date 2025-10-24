"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStrategyStore } from "@/store/strategy";
import { useAccount } from "wagmi";

export default function AutoExecutor() {
  const { isActive, arbitrage } = useStrategyStore();
  const { address } = useAccount();

  const [router, setRouter] = useState("");
  const [tokenIn, setTokenIn] = useState("");
  const [tokenOut, setTokenOut] = useState("");
  const [amountIn, setAmountIn] = useState("100");
  const [decimalsIn, setDecimalsIn] = useState("6");
  const [decimalsOut, setDecimalsOut] = useState("18");
  const [priceId, setPriceId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [maxAgeSec, setMaxAgeSec] = useState("60");
  const [boundsBps, setBoundsBps] = useState("50");

  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (address && !recipient) setRecipient(address);
  }, [address, recipient]);

  const slippageBps = useMemo(() => arbitrage.maxSlippageBps, [arbitrage.maxSlippageBps]);
  const thresholdBps = useMemo(() => arbitrage.spreadBps, [arbitrage.spreadBps]);

  async function runTick() {
    if (!router || !tokenIn || !tokenOut || !priceId || !recipient) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/strategy/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          router,
          tokenIn,
          tokenOut,
          amountIn: Number(amountIn),
          decimalsIn: Number(decimalsIn),
          decimalsOut: Number(decimalsOut),
          priceId,
          recipient,
          thresholdBps,
          slippageBps,
          boundsBps: Number(boundsBps),
          maxAgeSec: Number(maxAgeSec),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Tick failed");
      setLast({ ...json, at: new Date().toISOString() });
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isActive) {
      // run immediately and then every 20s
      runTick();
      intervalRef.current = setInterval(runTick, 20000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, router, tokenIn, tokenOut, priceId, recipient, amountIn, decimalsIn, decimalsOut, thresholdBps, slippageBps, boundsBps, maxAgeSec]);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Auto Execute (Server signer)</h3>
        <span className="text-xs text-muted-foreground">Runs when Start is Active</span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-sm" title="SaucerSwap Router">
          <div className="mb-1 text-muted-foreground">Router</div>
          <input className="w-full rounded-md border px-2 py-1" value={router} onChange={(e) => setRouter(e.target.value)} placeholder="0.0.19264" />
        </label>
        <label className="block text-sm" title="Token In">
          <div className="mb-1 text-muted-foreground">Token In</div>
          <input className="w-full rounded-md border px-2 py-1" value={tokenIn} onChange={(e) => setTokenIn(e.target.value)} />
        </label>
        <label className="block text-sm" title="Token Out">
          <div className="mb-1 text-muted-foreground">Token Out</div>
          <input className="w-full rounded-md border px-2 py-1" value={tokenOut} onChange={(e) => setTokenOut(e.target.value)} />
        </label>
        <label className="block text-sm" title="Amount In">
          <div className="mb-1 text-muted-foreground">Amount In</div>
          <input className="w-full rounded-md border px-2 py-1" value={amountIn} onChange={(e) => setAmountIn(e.target.value)} />
        </label>
        <label className="block text-sm" title="Decimals In">
          <div className="mb-1 text-muted-foreground">Decimals In</div>
          <input className="w-full rounded-md border px-2 py-1" value={decimalsIn} onChange={(e) => setDecimalsIn(e.target.value)} />
        </label>
        <label className="block text-sm" title="Decimals Out">
          <div className="mb-1 text-muted-foreground">Decimals Out</div>
          <input className="w-full rounded-md border px-2 py-1" value={decimalsOut} onChange={(e) => setDecimalsOut(e.target.value)} />
        </label>
        <label className="block text-sm" title="Pyth Feed ID (bytes32)">
          <div className="mb-1 text-muted-foreground">Price Feed ID</div>
          <input className="w-full rounded-md border px-2 py-1" value={priceId} onChange={(e) => setPriceId(e.target.value)} placeholder="0x..." />
        </label>
        <label className="block text-sm" title="Recipient">
          <div className="mb-1 text-muted-foreground">Recipient</div>
          <input className="w-full rounded-md border px-2 py-1" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0x..." />
        </label>
        <label className="block text-sm" title="Max Age (sec)">
          <div className="mb-1 text-muted-foreground">Max Age (sec)</div>
          <input className="w-full rounded-md border px-2 py-1" value={maxAgeSec} onChange={(e) => setMaxAgeSec(e.target.value)} />
        </label>
        <label className="block text-sm" title="Bounds (bps)">
          <div className="mb-1 text-muted-foreground">Bounds (bps)</div>
          <input className="w-full rounded-md border px-2 py-1" value={boundsBps} onChange={(e) => setBoundsBps(e.target.value)} />
        </label>
        <div className="flex items-end gap-2">
          <button onClick={runTick} disabled={loading} className="px-3 py-2 rounded-md border text-sm hover:bg-accent w-full">{loading ? "Running…" : "Run Once"}</button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {last && (
        <div className="text-sm space-y-1">
          <div>At: {last.at}</div>
          {last.spreadBps !== undefined && <div>Spread: {(Number(last.spreadBps) / 100).toFixed(2)}%</div>}
          {last.dexPrice !== undefined && <div>DEX Price: {Number(last.dexPrice).toLocaleString(undefined, { maximumFractionDigits: 8 })}</div>}
          {last.pythPrice !== undefined && <div>Pyth Price: {Number(last.pythPrice).toLocaleString(undefined, { maximumFractionDigits: 8 })}</div>}
          {last.txHash && <div className="text-green-600">Executed: {last.txHash}</div>}
          {last.note && <div className="text-muted-foreground">{last.note}</div>}
        </div>
      )}
      <div className="text-xs text-muted-foreground">Uses server signer. For non-custodial execution, we will switch to Vincent (PKP).</div>
    </div>
  );
}
