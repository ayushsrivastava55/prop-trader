import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { hederaTestnet } from "@/lib/chains";

// Only use injected connector (MetaMask, browser wallets) to avoid dependency issues
const connectors = [injected()];

export const config = createConfig({
  chains: [hederaTestnet],
  transports: {
    [hederaTestnet.id]: http(hederaTestnet.rpcUrls.default.http[0]!),
  },
  connectors,
});
