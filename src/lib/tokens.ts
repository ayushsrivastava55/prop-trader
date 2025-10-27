// Hedera Testnet Token List
export type Token = {
  id: string; // Hedera ID (0.0.x) or EVM address (0x...)
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
};

// Known Hedera Testnet tokens - verified IDs
export const HEDERA_TESTNET_TOKENS: Token[] = [
  {
    id: "HBAR",
    symbol: "HBAR",
    name: "Hedera (Native)",
    decimals: 8,
    logo: "https://cryptologos.cc/logos/hedera-hbar-logo.png",
  },
  {
    id: "0.0.429274",
    symbol: "USDC",
    name: "USD Coin (Testnet)",
    decimals: 6,
    logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  },
  {
    id: "0.0.731861",
    symbol: "WHBAR",
    name: "Wrapped HBAR",
    decimals: 8,
    logo: "https://cryptologos.cc/logos/hedera-hbar-logo.png",
  },
  {
    id: "0.0.1456986",
    symbol: "SAUCE",
    name: "SaucerSwap Token",
    decimals: 6,
    logo: "https://www.saucerswap.finance/logo.svg",
  },
  {
    id: "0.0.456858",
    symbol: "USDC[hts]",
    name: "USDC (HTS Testnet)",
    decimals: 6,
    logo: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  },
];

export const SAUCERSWAP_ROUTER_TESTNET = "0.0.19264";

export function getTokenBySymbol(symbol: string): Token | undefined {
  return HEDERA_TESTNET_TOKENS.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase());
}

export function getTokenById(id: string): Token | undefined {
  return HEDERA_TESTNET_TOKENS.find((t) => t.id === id);
}
