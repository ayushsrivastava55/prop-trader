import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@lit-protocol/vincent-contracts-sdk";
import { ethers } from "ethers";

const RPC_URL = process.env.CHRONICLE_YELLOWSTONE_RPC || process.env.RPC_URL || "";
const APP_ID_ENV = process.env.VINCENT_APP_ID || process.env.NEXT_PUBLIC_VINCENT_APP_ID || "";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const pkp = url.searchParams.get("pkp") || url.searchParams.get("pkpEthAddress");
    const appIdParam = url.searchParams.get("appId");
    const appIdStr = appIdParam || APP_ID_ENV;

    if (!pkp) {
      return NextResponse.json({ error: "pkp (PKP EOA address) is required as a query param" }, { status: 400 });
    }

    // ethers v5/v6 address check support
    const isAddr = (() => {
      try {
        // v6
        // @ts-ignore
        if (ethers?.isAddress) return (ethers as any).isAddress(pkp);
        // v5
        // @ts-ignore
        if (ethers?.utils?.isAddress) return (ethers as any).utils.isAddress(pkp);
      } catch {}
      return false;
    })();
    if (!isAddr) {
      return NextResponse.json({ error: "invalid pkp address" }, { status: 400 });
    }

    if (!RPC_URL) {
      return NextResponse.json({ error: "Server RPC not configured. Set CHRONICLE_YELLOWSTONE_RPC or RPC_URL." }, { status: 500 });
    }

    const appId = Number(appIdStr);
    if (!Number.isFinite(appId)) {
      return NextResponse.json({ error: "Vincent App ID not configured. Pass ?appId= or set VINCENT_APP_ID." }, { status: 400 });
    }

    // Build a read-only signer
    // Prefer v5 provider signature; fallback to v6
    let provider: any;
    // @ts-ignore
    if (ethers?.providers?.JsonRpcProvider) {
      // v5
      // @ts-ignore
      provider = new (ethers as any).providers.JsonRpcProvider(RPC_URL);
    } else {
      // v6
      // @ts-ignore
      provider = new (ethers as any).JsonRpcProvider(RPC_URL);
    }

    const wallet = (ethers as any).Wallet.createRandom();
    const signer = wallet.connect(provider);

    const client = getClient({ signer });
    const version = await client.getPermittedAppVersionForPkp({ appId, pkpEthAddress: pkp });

    return NextResponse.json({
      pkp,
      appId,
      version,
      permitted: version !== null && Number(version) > 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
