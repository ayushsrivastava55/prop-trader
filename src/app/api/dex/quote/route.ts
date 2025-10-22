import { NextRequest, NextResponse } from "next/server";
import { Address, createPublicClient, formatUnits, http, parseAbi } from "viem";
import { hederaTestnet } from "@/lib/chains";

const abi = parseAbi([
  // UniswapV2-style router quoting function
  "function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts)",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const routerIn = body?.router as string | undefined;
    const tokenInIn = body?.tokenIn as string | undefined;
    const tokenOutIn = body?.tokenOut as string | undefined;
    const amountIn = body?.amountIn as string | number | undefined; // decimal string or number
    const decimalsIn = Number(body?.decimalsIn ?? 6);
    const decimalsOut = Number(body?.decimalsOut ?? 18);

    if (!routerIn || !tokenInIn || !tokenOutIn || !Number.isFinite(Number(amountIn))) {
      return NextResponse.json({ error: "router, tokenIn, tokenOut, amountIn required" }, { status: 400 });
    }

    const client = createPublicClient({
      chain: hederaTestnet,
      transport: http(hederaTestnet.rpcUrls.default.http[0]!),
    });

    const resolveToEvm = async (addr: string): Promise<Address> => {
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

    const [router, tokenIn, tokenOut] = await Promise.all([
      resolveToEvm(routerIn),
      resolveToEvm(tokenInIn),
      resolveToEvm(tokenOutIn),
    ]);

    const amtInWei = BigInt(Math.floor(Number(amountIn) * 10 ** decimalsIn));

    const amounts = await client.readContract({
      address: router,
      abi,
      functionName: "getAmountsOut",
      args: [amtInWei, [tokenIn, tokenOut]],
    });

    const outWei = (amounts as bigint[])[1];
    const amountOut = Number(formatUnits(outWei, decimalsOut));

    return NextResponse.json({
      amountIn: Number(amountIn),
      amountOut,
      rawOut: outWei.toString(),
      router,
      tokenIn,
      tokenOut,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
