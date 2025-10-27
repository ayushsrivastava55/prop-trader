"use client";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import TokenSelect from "@/components/token-select";
import { Token, SAUCERSWAP_ROUTER_TESTNET, getTokenBySymbol } from "@/lib/tokens";
import { PYTH_FEEDS } from "@/lib/pyth";
import { useTradesStore } from "@/store/trades";

export default function ExecuteSwapPrep() {
  const { address } = useAccount();
  const { addTrade } = useTradesStore();
  const [router, setRouter] = useState(SAUCERSWAP_ROUTER_TESTNET);
  const [tokenInId, setTokenInId] = useState(getTokenBySymbol("USDC")?.id || "");
  const [tokenOutId, setTokenOutId] = useState(getTokenBySymbol("WHBAR")?.id || "");
  const [amountIn, setAmountIn] = useState("10");
  const [priceId, setPriceId] = useState(PYTH_FEEDS.USDC_USD);
  const [maxAgeSec, setMaxAgeSec] = useState("60");
  const [slippageBps, setSlippageBps] = useState("50");
  const [boundsBps, setBoundsBps] = useState("50");
  const [recipient, setRecipient] = useState("");
  const [pkp, setPkp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [execLoading, setExecLoading] = useState(false);
  const [execError, setExecError] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<any>(null);

  // wagmi write hooks
  const { writeContract, data: pendingHash, isPending } = useWriteContract();
  const { data: receipt, isLoading: isWaiting } = useWaitForTransactionReceipt({ hash: pendingHash });

  useEffect(() => {
    if (address && !recipient) setRecipient(address);
  }, [address, recipient]);

  async function onPrepare() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const body: any = {
        router,
        tokenIn: tokenInId,
        tokenOut: tokenOutId,
        amountIn,
        priceId,
        maxAgeSec: Number(maxAgeSec),
        slippageBps: Number(slippageBps),
        boundsBps: Number(boundsBps),
        owner: pkp || address,
      };

      const res = await fetch("/api/strategy/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Prepare failed");
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function onExecuteVincent() {
    if (!data || !pkp) return;
    setExecLoading(true);
    setExecError(null);
    setExecResult(null);
    try {
      const params = {
        executor: data.executor,
        router: data.router,
        tokenIn: data.tokenIn,
        tokenOut: data.tokenOut,
        amountInWei: String(data.amountInWei),
        minAmountOutWei: String(data.minAmountOutWei),
        recipient,
        priceUpdateData: data.updateData,
        priceId: data.priceId,
        maxAgeSec: Number(data.maxAgeSec),
        minPrice1e8: String(data.minPrice1e8),
        maxPrice1e8: String(data.maxPrice1e8),
        feeWei: String(data.feeWei),
      } as const;
      const res = await fetch("/api/vincent/execute-swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delegatorPkpEthAddress: pkp, params }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Vincent execute failed");
      setExecResult(json);
      if (json.txHash) {
        addTrade({
          txHash: json.txHash,
          path: "vincent",
          amountInWei: String(data.amountInWei),
          tokenIn: tokenInId,
          tokenOut: tokenOutId,
          recipient,
          at: Date.now(),
        });
      }
    } catch (e: any) {
      setExecError(e?.message || "Vincent execute failed");
    } finally {
      setExecLoading(false);
    }
  }

  async function onApproveWallet() {
    if (!data) return;
    try {
      setExecError(null);
      setExecResult(null);
      const erc20Abi = [
        "function approve(address spender, uint256 value) returns (bool)",
      ] as const;
      writeContract({
        abi: erc20Abi,
        address: data.tokenIn as `0x${string}`,
        functionName: "approve",
        args: [data.executor as `0x${string}`, BigInt(data.amountInWei)],
      });
    } catch (e: any) {
      setExecError(e?.message || "Approve failed");
    }
  }

  async function onExecuteWallet() {
    if (!data) return;
    try {
      setExecError(null);
      setExecResult(null);
      const EXECUTOR_ABI = [
        "function executeSwapWithOracle(address router,address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,address recipient,bytes[] priceUpdateData,bytes32 priceId,uint64 maxAgeSec,int64 minPrice,int64 maxPrice) payable returns (uint256)",
      ] as const;
      writeContract({
        abi: EXECUTOR_ABI,
        address: data.executor as `0x${string}`,
        functionName: "executeSwapWithOracle",
        args: [
          data.router as `0x${string}`,
          data.tokenIn as `0x${string}`,
          data.tokenOut as `0x${string}`,
          BigInt(data.amountInWei),
          BigInt(data.minAmountOutWei),
          recipient as `0x${string}`,
          data.updateData as `0x${string}`[],
          data.priceId as `0x${string}`,
          BigInt(data.maxAgeSec),
          Number(data.minPrice1e8),
          Number(data.maxPrice1e8),
        ],
        value: BigInt(data.feeWei),
      });
    } catch (e: any) {
      setExecError(e?.message || "Execute (wallet) failed");
    }
  }
  

  async function onExecute() {
    if (!data) return;
    setExecLoading(true);
    setExecError(null);
    setExecResult(null);
    try {
      const body = {
        executor: data.executor,
        router: data.router,
        tokenIn: data.tokenIn,
        tokenOut: data.tokenOut,
        amountInWei: data.amountInWei,
        minAmountOutWei: data.minAmountOutWei,
        recipient,
        updateData: data.updateData,
        priceId: data.priceId,
        maxAgeSec: data.maxAgeSec,
        minPrice1e8: data.minPrice1e8,
        maxPrice1e8: data.maxPrice1e8,
        feeWei: data.feeWei,
      };
      const res = await fetch("/api/strategy/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Execute failed");
      setExecResult(json);
    } catch (e: any) {
      setExecError(e?.message || "Unknown error");
    } finally {
      setExecLoading(false);
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Prepare Swap (Addresses & Pyth Fee)</h3>
        <span className="text-xs text-muted-foreground">Resolves 0.0.x → EVM, quotes minOut, fetches Hermes updateData & fee</span>
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
        <label className="block text-sm" title="Input amount in human units (e.g., 10)">
          <div className="mb-1 text-muted-foreground">Amount In</div>
          <input className="w-full rounded-md border px-2 py-1" value={amountIn} onChange={(e) => setAmountIn(e.target.value)} />
        </label>
        <label className="block text-sm" title="Max allowed price age in seconds">
          <div className="mb-1 text-muted-foreground">Max Age (sec)</div>
          <input className="w-full rounded-md border px-2 py-1" value={maxAgeSec} onChange={(e) => setMaxAgeSec(e.target.value)} />
        </label>
        <label className="block text-sm" title="Slippage for minAmountOut (basis points)">
          <div className="mb-1 text-muted-foreground">Slippage (bps)</div>
          <input className="w-full rounded-md border px-2 py-1" value={slippageBps} onChange={(e) => setSlippageBps(e.target.value)} />
        </label>
        <label className="block text-sm" title="Bounds around current Pyth price for on-chain guard (bps)">
          <div className="mb-1 text-muted-foreground">Bounds (bps)</div>
          <input className="w-full rounded-md border px-2 py-1" value={boundsBps} onChange={(e) => setBoundsBps(e.target.value)} />
        </label>
        <label className="block text-sm" title="Recipient for swap proceeds">
          <div className="mb-1 text-muted-foreground">Recipient</div>
          <input className="w-full rounded-md border px-2 py-1" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0x..." />
        </label>
        <label className="block text-sm" title="Delegator PKP EOA address for Vincent execution">
          <div className="mb-1 text-muted-foreground">Delegator PKP EOA</div>
          <input className="w-full rounded-md border px-2 py-1" value={pkp} onChange={(e) => setPkp(e.target.value)} placeholder="0x..." />
        </label>
        <div className="flex items-end">
          <button onClick={onPrepare} disabled={loading || !router || !tokenInId || !tokenOutId || !priceId || !amountIn} className="px-3 py-2 rounded-md border text-sm hover:bg-accent w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white border-none">
            {loading ? "Preparing…" : "Prepare"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {data && (
        <div className="space-y-2">
          <div className="text-sm">Executor: {data.executor}</div>
          <div className="text-sm">Router (EVM): {data.router}</div>
          <div className="text-sm">Token In (EVM): {data.tokenIn} (dec {data.decimalsIn})</div>
          <div className="text-sm">Token Out (EVM): {data.tokenOut} (dec {data.decimalsOut})</div>
          <div className="text-sm">AmountIn (wei): {data.amountInWei}</div>
          <div className="text-sm">Quote Out (wei): {data.quoteOutWei}</div>
          <div className="text-sm">MinAmountOut (wei): {data.minAmountOutWei}</div>
          <div className="text-sm">Pyth Fee (wei): {data.feeWei}</div>
          <div className="text-sm">Price Bounds (1e8): {data.minPrice1e8} - {data.maxPrice1e8}</div>
          <div className="text-sm">Update Data len: {data.updateData?.length}</div>
          <div className="text-xs text-muted-foreground break-all">Hermes: {data.hermesUrl}</div>
          {data.owner && (
            <div className="text-sm">
              Allowance: {data.allowanceWei ?? "-"}
              {data.needsApproval !== null && (
                <span className={data.needsApproval ? "text-red-600" : "text-green-600"}>
                  {" "}· {data.needsApproval ? "Needs approval" : "Sufficient allowance"}
                </span>
              )}
            </div>
          )}
          <details className="text-xs">
            <summary>Payload</summary>
            <pre className="whitespace-pre-wrap break-all bg-muted p-2 rounded">{JSON.stringify(data, null, 2)}</pre>
          </details>
          <div className="flex gap-2 flex-wrap">
            <button onClick={onApproveWallet} className="px-3 py-2 rounded-md border text-sm hover:bg-accent">
              Approve via Wallet
            </button>
            <button onClick={onExecuteWallet} disabled={!recipient} className="px-3 py-2 rounded-md border text-sm hover:bg-accent">
              Execute via Wallet
            </button>
            <button onClick={onExecuteVincent} disabled={execLoading || !recipient || !pkp || data?.needsApproval === true} className="px-3 py-2 rounded-md border text-sm hover:bg-accent">
              {execLoading ? "Executing…" : "Execute via Vincent (PKP)"}
            </button>
            <button onClick={onExecute} disabled={execLoading || !recipient} className="px-3 py-2 rounded-md border text-sm hover:bg-accent">
              {execLoading ? "Executing…" : "Execute via Server"}
            </button>
          </div>
          {execError && <p className="text-sm text-destructive">{execError}</p>}
          {execResult && (
            <div className="space-y-2">
              {execResult.txHash && (
                <a href={`https://hashscan.io/testnet/tx/${execResult.txHash}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">
                  View on Hashscan: {execResult.txHash}
                </a>
              )}
              <pre className="text-xs whitespace-pre-wrap break-all bg-muted p-2 rounded">{JSON.stringify(execResult, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
      <div className="text-xs text-muted-foreground">
        Tip: You can approve and execute from your wallet, via server, or via Remix. For production non-custodial, we'll use Vincent (PKP).
      </div>
      {(isPending || isWaiting) && (
        <div className="text-xs text-muted-foreground">Waiting for transaction… {pendingHash}</div>
      )}
      {receipt && (
        <div className="text-xs text-green-600">Tx confirmed: {receipt.transactionHash}</div>
      )}
    </div>
  );
}
