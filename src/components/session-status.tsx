"use client";
import { useState } from "react";

const DEFAULT_APP_ID = Number(process.env.NEXT_PUBLIC_VINCENT_APP_ID || "");

export default function SessionStatus() {
  const [pkp, setPkp] = useState("");
  const [appId, setAppId] = useState<number | "">(Number.isFinite(DEFAULT_APP_ID) ? DEFAULT_APP_ID : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  async function onCheck() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const appIdParam = appId === "" ? "" : `&appId=${appId}`;
      const res = await fetch(`/api/vincent/session?pkp=${encodeURIComponent(pkp)}${appIdParam}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to fetch session");
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Vincent Session Status</h3>
        <span className="text-xs text-muted-foreground">Checks permitted app version for PKP</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-sm" title="PKP EOA address (0x...)">
          <div className="mb-1 text-muted-foreground">PKP Address</div>
          <input className="w-full rounded-md border px-2 py-1" value={pkp} onChange={(e) => setPkp(e.target.value)} />
        </label>
        <label className="block text-sm" title="Vincent App ID">
          <div className="mb-1 text-muted-foreground">App ID</div>
          <input
            type="number"
            className="w-full rounded-md border px-2 py-1"
            value={appId}
            onChange={(e) => setAppId(e.target.value ? Number(e.target.value) : "")}
          />
        </label>
        <div className="flex items-end">
          <button onClick={onCheck} disabled={loading || !pkp} className="px-3 py-2 rounded-md border text-sm hover:bg-accent w-full">
            {loading ? "Checking…" : "Check"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {data && (
        <div className="text-sm">
          <div>PKP: {data.pkp}</div>
          <div>App ID: {data.appId}</div>
          <div>Permitted Version: {data.version ?? "null"}</div>
          <div className={data.permitted ? "text-green-600" : "text-muted-foreground"}>
            {data.permitted ? "Permitted" : "Not Permitted"}
          </div>
        </div>
      )}
      <div className="text-xs text-muted-foreground">
        Note: Set server env CHRONICLE_YELLOWSTONE_RPC or RPC_URL to a Hedera Testnet JSON-RPC endpoint (e.g. https://testnet.hashio.io/api).
      </div>
    </div>
  );
}
