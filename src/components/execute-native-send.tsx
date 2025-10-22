"use client";
import { useState } from "react";

export default function ExecuteNativeSend() {
  const [pkp, setPkp] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("0.00001");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  async function onExecute() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/vincent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ability: "native-send",
          delegatorPkpEthAddress: pkp,
          params: { to, amount },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Execute failed");
      setResult(json);
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Execute Ability: Native Send</h3>
        <span className="text-xs text-muted-foreground">Runs real Vincent ability using delegatee server key</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-sm" title="PKP EOA address (0x...) permitted for this App version">
          <div className="mb-1 text-muted-foreground">Delegator PKP</div>
          <input className="w-full rounded-md border px-2 py-1" value={pkp} onChange={(e) => setPkp(e.target.value)} />
        </label>
        <label className="block text-sm" title="Recipient EOA">
          <div className="mb-1 text-muted-foreground">To</div>
          <input className="w-full rounded-md border px-2 py-1" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="block text-sm" title="Amount of network native token to send (as string)">
          <div className="mb-1 text-muted-foreground">Amount</div>
          <input className="w-full rounded-md border px-2 py-1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <div className="flex items-end">
          <button onClick={onExecute} disabled={loading || !pkp || !to || !amount} className="px-3 py-2 rounded-md border text-sm hover:bg-accent w-full">
            {loading ? "Executing…" : "Execute"}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <pre className="text-xs whitespace-pre-wrap break-all bg-muted p-2 rounded">{JSON.stringify(result, null, 2)}</pre>
      )}
      <div className="text-xs text-muted-foreground">
        Server must set CHRONICLE_YELLOWSTONE_RPC (or RPC_URL) and VINCENT_DELEGATEE_PRIVATE_KEY. The PKP must have granted permission to this App version and ability.
      </div>
    </div>
  );
}
