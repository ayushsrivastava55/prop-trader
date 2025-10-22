import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { hederaTestnet } from "@/lib/chains";

const wcProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

const connectors = [injected()];
if (wcProjectId) {
  connectors.push(
    walletConnect({
      projectId: wcProjectId,
      showQrModal: true,
    })
  );
}

export const config = createConfig({
  chains: [hederaTestnet],
  transports: {
    [hederaTestnet.id]: http(hederaTestnet.rpcUrls.default.http[0]!),
  },
  connectors,
});
