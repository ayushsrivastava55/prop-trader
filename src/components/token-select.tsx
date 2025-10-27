"use client";
import { useState } from "react";
import { HEDERA_TESTNET_TOKENS, Token } from "@/lib/tokens";

type TokenSelectProps = {
  value: string;
  onChange: (token: Token) => void;
  label?: string;
  placeholder?: string;
};

export default function TokenSelect({ value, onChange, label, placeholder }: TokenSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedToken = HEDERA_TESTNET_TOKENS.find((t) => t.id === value || t.symbol === value);
  const filtered = HEDERA_TESTNET_TOKENS.filter(
    (t) =>
      t.symbol.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      {label && <div className="mb-1 text-sm text-muted-foreground">{label}</div>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
      >
        {selectedToken ? (
          <div className="flex items-center gap-2">
            {selectedToken.logo && (
              <img src={selectedToken.logo} alt={selectedToken.symbol} className="w-5 h-5 rounded-full" />
            )}
            <span className="font-medium">{selectedToken.symbol}</span>
            <span className="text-xs text-muted-foreground">{selectedToken.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder || "Select token"}</span>
        )}
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full rounded-md border bg-background shadow-lg">
            <div className="p-2">
              <input
                type="text"
                placeholder="Search tokens..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filtered.map((token) => (
                <button
                  key={token.id}
                  type="button"
                  onClick={() => {
                    onChange(token);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                >
                  {token.logo && (
                    <img src={token.logo} alt={token.symbol} className="w-6 h-6 rounded-full" />
                  )}
                  <div className="flex-1 text-left">
                    <div className="font-medium">{token.symbol}</div>
                    <div className="text-xs text-muted-foreground">{token.name}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{token.decimals} dec</div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">No tokens found</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
