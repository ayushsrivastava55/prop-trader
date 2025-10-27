import { NextRequest, NextResponse } from "next/server";
import { Address, createPublicClient, formatUnits, http, parseAbi } from "viem";
import { hederaTestnet } from "@/lib/chains";

const routerAbi = parseAbi([
  "function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)",
]);

const erc20Abi = parseAbi([
  "function decimals() view returns (uint8)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

const pythAbi = parseAbi([
  "function getUpdateFee(bytes[] updateData) external view returns (uint256)",
]);

const EXECUTOR = process.env.NEXT_PUBLIC_STRATEGY_EXECUTOR_ADDRESS || process.env.STRATEGY_EXECUTOR_ADDRESS || "";
const PYTH_EVM = process.env.NEXT_PUBLIC_PYTH_EVM_ADDRESS || process.env.PYTH_EVM_ADDRESS || "";

async function resolveToEvm(addr: string): Promise<Address> {
  if (addr.startsWith("0x") && addr.length === 42) return addr as Address;
  // Try as contract first
  try {
    let res = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/contracts/${addr}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const evm = data?.evm_address as string | undefined;
      if (evm?.startsWith("0x")) return evm as Address;
    }
  } catch (e) {
    // Try token next
  }
  // Try as token
  try {
    const res = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/tokens/${addr}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const evm = data?.evm_address as string | undefined;
      if (evm?.startsWith("0x")) return evm as Address;
    }
  } catch (e) {
    // Fall through
  }
  throw new Error(`Mirror resolve failed for ${addr}. Use EVM address (0x...) instead.`);
}

async function fetchTokenDecimals(
  client: ReturnType<typeof createPublicClient>,
  originalId: string,
  evmAddr: Address,
  provided?: number
): Promise<number> {
  if (Number.isFinite(provided as number)) return provided as number;
  if (/^\d+\.\d+\.\d+$/.test(originalId)) {
    try {
      const res = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/tokens/${originalId}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const dec = data?.decimals;
        if (Number.isFinite(dec)) return Number(dec);
      }
    } catch (e) {
      // Fall through to on-chain call
    }
  }
  const dec = await client.readContract({ address: evmAddr, abi: erc20Abi, functionName: "decimals" });
  return Number(dec);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const routerIn = body?.router as string | undefined;
    const tokenInIn = body?.tokenIn as string | undefined;
    const tokenOutIn = body?.tokenOut as string | undefined;
    const amountIn = body?.amountIn as string | number | undefined;
    const decimalsInBody = body?.decimalsIn as number | undefined;
    const decimalsOutBody = body?.decimalsOut as number | undefined;
    const priceId = body?.priceId as string | undefined; // Pyth price feed id (bytes32 hex)
    const ownerIn = body?.owner as string | undefined; // optional owner for allowance check
    const maxAgeSec = Number(body?.maxAgeSec ?? 60);
    const slippageBps = Number(body?.slippageBps ?? 50); // 0.50%
    const boundsBps = Number(body?.boundsBps ?? 50); // ±0.50% bounds around current Pyth price

    if (!routerIn || !tokenInIn || !tokenOutIn || !Number.isFinite(Number(amountIn))) {
      return NextResponse.json({ error: "router, tokenIn, tokenOut, amountIn required" }, { status: 400 });
    }
    if (!priceId) {
      return NextResponse.json({ error: "priceId (bytes32) required for oracle guard" }, { status: 400 });
    }
    if (!EXECUTOR) {
      return NextResponse.json({ error: "StrategyExecutor address not set on server" }, { status: 500 });
    }
    if (!PYTH_EVM) {
      return NextResponse.json({ error: "PYTH_EVM_ADDRESS not set on server" }, { status: 500 });
    }

    const client = createPublicClient({ chain: hederaTestnet, transport: http(hederaTestnet.rpcUrls.default.http[0]!) });

    const [router, tokenIn, tokenOut] = await Promise.all([
      resolveToEvm(routerIn),
      resolveToEvm(tokenInIn),
      resolveToEvm(tokenOutIn),
    ]);

    const [decimalsIn, decimalsOut] = await Promise.all([
      fetchTokenDecimals(client, tokenInIn, tokenIn, decimalsInBody),
      fetchTokenDecimals(client, tokenOutIn, tokenOut, decimalsOutBody),
    ]);

    const amtInWei = BigInt(Math.floor(Number(amountIn) * 10 ** decimalsIn));

    // getAmountsOut for quote
    const amounts = await client.readContract({
      address: router,
      abi: routerAbi,
      functionName: "getAmountsOut",
      args: [amtInWei, [tokenIn, tokenOut]],
    });
    const outWei = (amounts as bigint[])[1];

    // minAmountOut with slippage
    const minAmountOut = (outWei * BigInt(10_000 - slippageBps)) / BigInt(10_000);

    // Hermes update data (hex)
    const qs = new URLSearchParams();
    qs.append("ids[]", priceId);
    qs.append("encoding", "hex");
    const hermesUrl = `https://hermes.pyth.network/v2/updates/price/latest?${qs.toString()}`;
    const hermesRes = await fetch(hermesUrl, { cache: "no-store" });
    if (!hermesRes.ok) {
      const t = await hermesRes.text();
      return NextResponse.json({ error: `Hermes error: ${t}` }, { status: 502 });
    }
    const hermes = await hermesRes.json();
    const updateData: string[] = hermes?.binary?.data;
    if (!updateData?.length) return NextResponse.json({ error: "No update data from Hermes" }, { status: 502 });

    // Compute fee via Pyth
    const fee = await client.readContract({ address: PYTH_EVM as Address, abi: pythAbi, functionName: "getUpdateFee", args: [updateData] });

    // Fetch current Pyth price (json) to compute bounds
    const priceJsonUrl = `https://hermes.pyth.network/v2/price/latest?ids[]=${priceId}`;
    const pj = await fetch(priceJsonUrl, { cache: "no-store" });
    if (!pj.ok) return NextResponse.json({ error: `Hermes price error: ${await pj.text()}` }, { status: 502 });
    const pjData = await pj.json();
    const priceItem = pjData?.prices?.[0];
    const expo = priceItem?.price?.expo as number;
    const price = priceItem?.price?.price as number;
    if (typeof expo !== "number" || typeof price !== "number") {
      return NextResponse.json({ error: "Malformed Hermes price" }, { status: 502 });
    }
    // Scale to 1e8 (target expo -8)
    const targetExpo = -8;
    const diff = targetExpo - expo;
    let scaled = price;
    if (diff > 0) for (let i = 0; i < diff; i++) scaled *= 10;
    if (diff < 0) for (let i = 0; i < -diff; i++) scaled = Math.trunc(scaled / 10);
    const minPrice = Math.trunc(scaled * (1 - boundsBps / 10_000));
    const maxPrice = Math.trunc(scaled * (1 + boundsBps / 10_000));

    // Optional allowance check (owner -> executor)
    let allowanceWei: bigint | null = null;
    if (ownerIn) {
      try {
        allowanceWei = await client.readContract({ address: tokenIn, abi: erc20Abi, functionName: "allowance", args: [ownerIn as Address, EXECUTOR as Address] });
      } catch {}
    }

    return NextResponse.json({
      executor: EXECUTOR,
      router,
      tokenIn,
      tokenOut,
      decimalsIn,
      decimalsOut,
      amountIn: Number(amountIn),
      amountInWei: amtInWei.toString(),
      quoteOutWei: outWei.toString(),
      minAmountOutWei: minAmountOut.toString(),
      feeWei: (fee as bigint).toString(),
      priceId,
      maxAgeSec,
      boundsBps,
      currentPrice1e8: scaled,
      minPrice1e8: minPrice,
      maxPrice1e8: maxPrice,
      updateData,
      hermesUrl,
      owner: ownerIn || null,
      allowanceWei: allowanceWei ? allowanceWei.toString() : null,
      needsApproval: allowanceWei !== null ? (allowanceWei as bigint) < amtInWei : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
