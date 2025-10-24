import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { getVincentAbilityClient } from "@lit-protocol/vincent-app-sdk/abilityClient";

const RPC_URL = process.env.CHRONICLE_YELLOWSTONE_RPC || process.env.RPC_URL || "";
const DELEGATEE_PK = process.env.VINCENT_DELEGATEE_PRIVATE_KEY || "";

export async function POST(req: NextRequest) {
  try {
    if (!RPC_URL) {
      return NextResponse.json({ error: "Server RPC not configured. Set CHRONICLE_YELLOWSTONE_RPC or RPC_URL." }, { status: 500 });
    }
    if (!DELEGATEE_PK) {
      return NextResponse.json({ error: "VINCENT_DELEGATEE_PRIVATE_KEY is not set on server" }, { status: 500 });
    }

    const body = await req.json();
    const delegatorPkpEthAddress = body?.delegatorPkpEthAddress as string | undefined;
    const params = body?.params;

    if (!delegatorPkpEthAddress) {
      return NextResponse.json({ error: "delegatorPkpEthAddress is required" }, { status: 400 });
    }

    // Dynamic import the locally bundled SaucerSwap ability
    let bundledVincentAbility: any;
    try {
      const mod: any = await import("@proptrader/ability-saucer-swap");
      bundledVincentAbility = mod.bundledVincentAbility || mod.default || mod;
    } catch (e: any) {
      return NextResponse.json(
        {
          error: "SaucerSwap ability package not installed or not built",
          hint: "Build the ability in the starter kit and add it as a dependency: pnpm -C starters/vincent-ability-starter-kit nx run ability-saucer-swap:build, then pnpm add @proptrader/ability-saucer-swap@file:../starters/vincent-ability-starter-kit/packages/ability-saucer-swap",
        },
        { status: 501 }
      );
    }

    // Build delegatee signer (ethers v6)
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(DELEGATEE_PK, provider);

    const abilityClient = getVincentAbilityClient({ bundledVincentAbility, ethersSigner: signer });

    const result = await abilityClient.execute(params, { delegatorPkpEthAddress });

    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
