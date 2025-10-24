import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const RPC_URL = process.env.CHRONICLE_YELLOWSTONE_RPC || process.env.RPC_URL || "";
const DELEGATEE_PK = process.env.VINCENT_DELEGATEE_PRIVATE_KEY || "";
const DEFAULT_EXECUTOR = process.env.NEXT_PUBLIC_STRATEGY_EXECUTOR_ADDRESS || process.env.STRATEGY_EXECUTOR_ADDRESS || "";

const EXECUTOR_ABI = [
  "function executeSwapWithOracle(address router,address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,address recipient,bytes[] priceUpdateData,bytes32 priceId,uint64 maxAgeSec,int64 minPrice,int64 maxPrice) payable returns (uint256)"
];

export async function POST(req: NextRequest) {
  try {
    if (!RPC_URL) return NextResponse.json({ error: "RPC not configured" }, { status: 500 });
    if (!DELEGATEE_PK) return NextResponse.json({ error: "VINCENT_DELEGATEE_PRIVATE_KEY missing" }, { status: 500 });

    const body = await req.json();
    const executor = (body?.executor as string | undefined) || DEFAULT_EXECUTOR;
    const router = body?.router as string;
    const tokenIn = body?.tokenIn as string;
    const tokenOut = body?.tokenOut as string;
    const amountInWei = BigInt(body?.amountInWei);
    const minAmountOutWei = BigInt(body?.minAmountOutWei);
    const recipient = body?.recipient as string;
    const updateData = body?.updateData as string[];
    const priceId = body?.priceId as string;
    const maxAgeSec = BigInt(body?.maxAgeSec ?? 60);
    const minPrice1e8 = Number(body?.minPrice1e8);
    const maxPrice1e8 = Number(body?.maxPrice1e8);
    const feeWei = BigInt(body?.feeWei ?? 0);

    if (!executor) return NextResponse.json({ error: "executor address required" }, { status: 400 });
    if (!router || !tokenIn || !tokenOut || !recipient) return NextResponse.json({ error: "router, tokenIn, tokenOut, recipient required" }, { status: 400 });
    if (!updateData?.length) return NextResponse.json({ error: "updateData[] required" }, { status: 400 });
    if (typeof priceId !== "string" || !priceId.startsWith("0x")) return NextResponse.json({ error: "priceId bytes32 required" }, { status: 400 });

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(DELEGATEE_PK, provider);

    const contract = new ethers.Contract(executor, EXECUTOR_ABI, signer);

    const tx = await contract.executeSwapWithOracle(
      router,
      tokenIn,
      tokenOut,
      amountInWei,
      minAmountOutWei,
      recipient,
      updateData,
      priceId,
      maxAgeSec,
      minPrice1e8,
      maxPrice1e8,
      { value: feeWei }
    );

    const receipt = await tx.wait();
    return NextResponse.json({ txHash: tx.hash, status: receipt?.status }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
