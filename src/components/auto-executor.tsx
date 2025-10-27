"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStrategyStore } from "@/store/strategy";
import { useAccount } from "wagmi";
import TokenSelect from "@/components/token-select";
import { Token, SAUCERSWAP_ROUTER_TESTNET, getTokenBySymbol } from "@/lib/tokens";
import { PYTH_FEEDS } from "@/lib/pyth";
import { useTradesStore } from "@/store/trades";

export default function AutoExecutor() {
  const { isActive, arbitrage } = useStrategyStore();
  const { address } = useAccount();
  const { addTrade } = useTradesStore();

  const [router, setRouter] = useState(SAUCERSWAP_ROUTER_TESTNET);
  const [tokenInId, setTokenInId] = useState(getTokenBySymbol("USDC")?.id || "");
  const [tokenOutId, setTokenOutId] = useState(getTokenBySymbol("WHBAR")?.id || "");
  const [amountIn, setAmountIn] = useState("10");
  const [priceId, setPriceId] = useState(PYTH_FEEDS.USDC_USD);
  const [recipient, setRecipient] = useState("");
  const [maxAgeSec, setMaxAgeSec] = useState("60");
  const [boundsBps, setBoundsBps] = useState("50");
  const [vincent, setVincent] = useState(false);
  const [pkp, setPkp] = useState("");

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
    if (!router || !tokenInId || !tokenOutId || !priceId || !recipient) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/strategy/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          router,
          tokenIn: tokenInId,
          tokenOut: tokenOutId,
          amountIn,
          priceId,
          recipient,
          thresholdBps,
          slippageBps,
          boundsBps: Number(boundsBps),
          maxAgeSec: Number(maxAgeSec),
          vincent,
          pkp,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Tick failed");
      setLast({ ...json, at: new Date().toISOString() });
      if (json.txHash) {
        addTrade({
          txHash: json.txHash,
          path: vincent ? "vincent" : "server",
          amountInWei: json.amountInWei,
          tokenIn: tokenInId,
          tokenOut: tokenOutId,
          recipient,
          at: Date.now(),
        });
      }
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
  }, [isActive, router, tokenInId, tokenOutId, priceId, recipient, amountIn, thresholdBps, slippageBps, boundsBps, maxAgeSec, vincent, pkp]);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Auto Execute</h3>
        <span className="text-xs text-muted-foreground">Runs when Start is Active</span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <TokenSelect
          value={tokenInId}
          onChange={(token) => setTokenInId(token.id)}
          label="Token In"
          placeholder="Select token to sell"
        />
        <TokenSelect
          value={tokenOutId}
          onChange={(token) => setTokenOutId(token.id)}
          label="Token Out"
          placeholder="Select token to buy"
        />
        <label className="block text-sm" title="Amount In">
          <div className="mb-1 text-muted-foreground">Amount In</div>
          <input className="w-full rounded-md border px-2 py-1" value={amountIn} onChange={(e) => setAmountIn(e.target.value)} />
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
        <label className="flex items-center gap-2 text-sm" title="Use Vincent PKP for execution">
          <input type="checkbox" checked={vincent} onChange={(e) => setVincent(e.target.checked)} />
          <span>Use Vincent (PKP)</span>
        </label>
        {vincent && (
          <label className="block text-sm" title="Delegator PKP EOA">
            <div className="mb-1 text-muted-foreground">Delegator PKP EOA</div>
            <input className="w-full rounded-md border px-2 py-1" value={pkp} onChange={(e) => setPkp(e.target.value)} placeholder="0x..." />
          </label>
        )}
        <div className="flex items-end gap-2">
          <button onClick={runTick} disabled={loading} className="px-3 py-2 rounded-md text-sm w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all">{loading ? "Running…" : "Run Once"}</button>
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
      <div className="text-xs text-muted-foreground">Server or Vincent (PKP) based on toggle.</div>
    </div>
  );
}
