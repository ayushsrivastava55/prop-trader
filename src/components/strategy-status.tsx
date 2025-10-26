"use client";
import { useTradesStore } from "@/store/trades";

export default function StrategyStatus() {
  const { trades, clear } = useTradesStore();
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Strategy Status</h3>
        <button onClick={clear} className="text-xs underline">Clear</button>
      </div>
      {trades.length === 0 && <p className="text-sm text-muted-foreground">No trades yet.</p>}
      {trades.length > 0 && (
        <div className="space-y-2">
          {trades.map((t) => (
            <div key={t.txHash} className="text-sm flex items-center justify-between gap-2">
              <div className="truncate">
                <div className="text-xs text-muted-foreground">{new Date(t.at).toLocaleString()}</div>
                <div>
                  <span className="mr-2 px-1.5 py-0.5 rounded bg-muted text-xs">{t.path}</span>
                  {t.amountInWei && <span className="text-xs">in: {t.amountInWei}</span>}
                </div>
                {t.tokenIn && t.tokenOut && (
                  <div className="text-xs text-muted-foreground">{t.tokenIn} → {t.tokenOut}</div>
                )}
              </div>
              <a
                href={`https://hashscan.io/testnet/tx/${t.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 underline truncate"
              >
                {t.txHash}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
