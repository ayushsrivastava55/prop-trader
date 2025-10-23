import { NextRequest, NextResponse } from "next/server";
import { Address, createPublicClient, http, parseAbi } from "viem";
import { hederaTestnet } from "@/lib/chains";

const abi = parseAbi([
  "function getUpdateFee(bytes[] updateData) external view returns (uint256)",
]);

const ENV_PYTH = process.env.PYTH_EVM_ADDRESS || process.env.NEXT_PUBLIC_PYTH_EVM_ADDRESS || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pythIn = (body?.pyth as string | undefined) || ENV_PYTH;
    const updateData = body?.updateData as string[] | undefined; // hex strings from Hermes

    if (!pythIn) return NextResponse.json({ error: "pyth (EVM address) required via body or env" }, { status: 400 });
    if (!Array.isArray(updateData) || updateData.length === 0)
      return NextResponse.json({ error: "updateData: string[] (Hermes hex) is required" }, { status: 400 });

    const client = createPublicClient({ chain: hederaTestnet, transport: http(hederaTestnet.rpcUrls.default.http[0]!) });

    const pyth = (pythIn as Address);
    const fee = await client.readContract({ address: pyth, abi, functionName: "getUpdateFee", args: [updateData] });

    return NextResponse.json({ fee: fee.toString() }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
