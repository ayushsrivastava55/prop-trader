import { NextRequest, NextResponse } from "next/server";
import { Address, createPublicClient, http, parseAbi } from "viem";
import { ethers } from "ethers";
import { hederaTestnet } from "@/lib/chains";

const routerAbi = parseAbi([
  "function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)",
]);

const erc20Abi = parseAbi(["function decimals() view returns (uint8)"]);
const pythAbi = parseAbi(["function getUpdateFee(bytes[] updateData) external view returns (uint256)"]);

const EXECUTOR = process.env.NEXT_PUBLIC_STRATEGY_EXECUTOR_ADDRESS || process.env.STRATEGY_EXECUTOR_ADDRESS || "";
const PYTH_EVM = process.env.NEXT_PUBLIC_PYTH_EVM_ADDRESS || process.env.PYTH_EVM_ADDRESS || "";
const RPC_URL = process.env.CHRONICLE_YELLOWSTONE_RPC || process.env.RPC_URL || "";
const DELEGATEE_PK = process.env.VINCENT_DELEGATEE_PRIVATE_KEY || "";

async function resolveToEvm(addr: string): Promise<Address> {
  if (addr.startsWith("0x") && addr.length === 42) return addr as Address;
  // Try as contract first
  let res = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/contracts/${addr}`);
  if (res.ok) {
    const data = await res.json();
    const evm = data?.evm_address as string | undefined;
    if (evm?.startsWith("0x")) return evm as Address;
  }
  // Try as token next
  res = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/tokens/${addr}`);
  if (res.ok) {
    const data = await res.json();
    const evm = data?.evm_address as string | undefined;
    if (evm?.startsWith("0x")) return evm as Address;
  }
  throw new Error(`Mirror resolve failed for ${addr}`);
}

export async function POST(req: NextRequest) {
  try {
    if (!EXECUTOR) return NextResponse.json({ error: "StrategyExecutor address not set" }, { status: 500 });
    if (!PYTH_EVM) return NextResponse.json({ error: "PYTH_EVM_ADDRESS not set" }, { status: 500 });
    if (!RPC_URL || !DELEGATEE_PK) return NextResponse.json({ error: "Server RPC or delegatee key not set" }, { status: 500 });

    const body = await req.json();
    const origin = req.nextUrl.origin;
    const routerIn = body?.router as string;
    const tokenInIn = body?.tokenIn as string;
    const tokenOutIn = body?.tokenOut as string;
    const amountIn = Number(body?.amountIn ?? 0);
    const decimalsInBody = body?.decimalsIn as number | undefined;
    const decimalsOutBody = body?.decimalsOut as number | undefined;
    const priceId = body?.priceId as string; // bytes32
    const recipient = (body?.recipient as string | undefined) || (body?.to as string | undefined);
    const thresholdBps = Number(body?.thresholdBps ?? 100);
    const slippageBps = Number(body?.slippageBps ?? 50);
    const boundsBps = Number(body?.boundsBps ?? 50);
    const maxAgeSec = Number(body?.maxAgeSec ?? 60);
    const vincent = Boolean(body?.vincent);
    const pkp = body?.pkp as string | undefined;

    if (!routerIn || !tokenInIn || !tokenOutIn || !Number.isFinite(amountIn) || amountIn <= 0) {
      return NextResponse.json({ error: "router, tokenIn, tokenOut, amountIn required" }, { status: 400 });
    }
    if (!priceId || !priceId.startsWith("0x")) {
      return NextResponse.json({ error: "priceId (bytes32) required" }, { status: 400 });
    }
    if (!recipient) {
      return NextResponse.json({ error: "recipient required" }, { status: 400 });
    }

    const client = createPublicClient({ chain: hederaTestnet, transport: http(hederaTestnet.rpcUrls.default.http[0]!) });

    // Resolve addresses
    const [router, tokenIn, tokenOut] = await Promise.all([
      resolveToEvm(routerIn),
      resolveToEvm(tokenInIn),
      resolveToEvm(tokenOutIn),
    ]);

    // Decimals
    const fetchTokenDecimals = async (originalId: string, evm: Address, provided?: number): Promise<number> => {
      if (Number.isFinite(provided as number)) return provided as number;
      if (/^\d+\.\d+\.\d+$/.test(originalId)) {
        const res = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/tokens/${originalId}`);
        if (res.ok) {
          const data = await res.json();
          const dec = data?.decimals;
          if (Number.isFinite(dec)) return Number(dec);
        }
      }
      const dec = await client.readContract({ address: evm, abi: erc20Abi, functionName: "decimals" });
      return Number(dec);
    };

    const [decimalsIn, decimalsOut] = await Promise.all([
      fetchTokenDecimals(tokenInIn, tokenIn, decimalsInBody),
      fetchTokenDecimals(tokenOutIn, tokenOut, decimalsOutBody),
    ]);

    const amtInWei = BigInt(Math.floor(amountIn * 10 ** decimalsIn));

    // DEX quote
    const amounts = await client.readContract({ address: router, abi: routerAbi, functionName: "getAmountsOut", args: [amtInWei, [tokenIn, tokenOut]] });
    const outWei = (amounts as bigint[])[1];
    const dexPrice = Number(amountIn) / (Number(outWei) / 10 ** decimalsOut);

    // Pyth price
    const pj = await fetch(`https://hermes.pyth.network/v2/price/latest?ids[]=${priceId}`, { cache: "no-store" });
    if (!pj.ok) return NextResponse.json({ error: `Hermes price error: ${await pj.text()}` }, { status: 502 });
    const pjData = await pj.json();
    const item = pjData?.prices?.[0];
    const expo = item?.price?.expo as number;
    const priceVal = item?.price?.price as number;
    if (typeof expo !== "number" || typeof priceVal !== "number") {
      return NextResponse.json({ error: "Malformed Hermes price" }, { status: 502 });
    }
    const pythPrice = priceVal * Math.pow(10, expo);

    const spreadBps = ((dexPrice - pythPrice) / pythPrice) * 10_000;
    const shouldExecute = Math.abs(spreadBps) >= thresholdBps;

    if (!shouldExecute) {
      return NextResponse.json({ shouldExecute, spreadBps, dexPrice, pythPrice, note: "Below threshold" }, { status: 200 });
    }

    // Prepare Hermes update data
    const qs = new URLSearchParams();
    qs.append("ids[]", priceId);
    qs.append("encoding", "hex");
    const hermesUrl = `https://hermes.pyth.network/v2/updates/price/latest?${qs.toString()}`;
    const hermesRes = await fetch(hermesUrl, { cache: "no-store" });
    if (!hermesRes.ok) return NextResponse.json({ error: `Hermes error: ${await hermesRes.text()}` }, { status: 502 });
    const hermes = await hermesRes.json();
    const updateData: string[] = hermes?.binary?.data;
    const updateDataHex = updateData as unknown as `0x${string}`[];
    if (!updateData?.length) return NextResponse.json({ error: "No update data from Hermes" }, { status: 502 });

    // Pyth fee
    const feeWei = await client.readContract({ address: PYTH_EVM as Address, abi: pythAbi, functionName: "getUpdateFee", args: [updateDataHex] });

    // Min amount out with slippage
    const minAmountOutWei = (outWei * BigInt(10_000 - slippageBps)) / BigInt(10_000);

    // Price bounds scaled to 1e8
    // Scale pythPrice to 1e8 manually since pythPrice is already in real units
    // Convert pythPrice (float) to int in 1e8
    const price1e8 = Math.trunc(pythPrice * 1e8);
    const minPrice1e8 = Math.trunc(price1e8 * (1 - boundsBps / 10_000));
    const maxPrice1e8 = Math.trunc(price1e8 * (1 + boundsBps / 10_000));

    if (vincent && pkp) {
      const erc20Abi = [
        "function balanceOf(address) view returns (uint256)",
        "function allowance(address,address) view returns (uint256)",
      ] as const;
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const erc20 = new ethers.Contract(tokenIn, erc20Abi, provider);
      const [bal, allowance] = await Promise.all([
        erc20.balanceOf(pkp),
        erc20.allowance(pkp, EXECUTOR),
      ]);
      if ((bal as bigint) < amtInWei) {
        return NextResponse.json({
          shouldExecute,
          spreadBps,
          dexPrice,
          pythPrice,
          note: `PKP insufficient balance: ${String(bal)} < ${String(amtInWei)}`,
        }, { status: 200 });
      }
      if ((allowance as bigint) < amtInWei) {
        return NextResponse.json({
          shouldExecute,
          spreadBps,
          dexPrice,
          pythPrice,
          note: `Needs approval: allowance ${String(allowance)} < ${String(amtInWei)}`,
        }, { status: 200 });
      }

      const abilityBody = {
        delegatorPkpEthAddress: pkp,
        params: {
          executor: EXECUTOR,
          router,
          tokenIn,
          tokenOut,
          amountInWei: amtInWei.toString(),
          minAmountOutWei: minAmountOutWei.toString(),
          recipient,
          priceUpdateData: updateDataHex,
          priceId,
          maxAgeSec,
          minPrice1e8: String(minPrice1e8),
          maxPrice1e8: String(maxPrice1e8),
          feeWei: (feeWei as bigint).toString(),
        },
      };
      const pres = await fetch(`${origin}/api/vincent/execute-swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(abilityBody),
      });
      const pobj = await pres.json();
      if (!pres.ok) return NextResponse.json({ error: pobj?.error || "Vincent execute failed" }, { status: 502 });
      return NextResponse.json({
        shouldExecute,
        spreadBps,
        dexPrice,
        pythPrice,
        ...pobj,
      }, { status: 200 });
    }

    // Execute with server signer
    const EXECUTOR_ABI = [
      "function executeSwapWithOracle(address router,address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,address recipient,bytes[] priceUpdateData,bytes32 priceId,uint64 maxAgeSec,int64 minPrice,int64 maxPrice) payable returns (uint256)",
    ];
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(DELEGATEE_PK, provider);
    const contract = new ethers.Contract(EXECUTOR, EXECUTOR_ABI, signer);

    const tx = await contract.executeSwapWithOracle(
      router,
      tokenIn,
      tokenOut,
      amtInWei,
      minAmountOutWei,
      recipient,
      updateData,
      priceId,
      BigInt(maxAgeSec),
      minPrice1e8,
      maxPrice1e8,
      { value: feeWei as bigint }
    );

    const receipt = await tx.wait();

    return NextResponse.json({
      shouldExecute,
      spreadBps,
      dexPrice,
      pythPrice,
      txHash: tx.hash,
      status: receipt?.status,
      quoteOutWei: outWei.toString(),
      minAmountOutWei: minAmountOutWei.toString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
