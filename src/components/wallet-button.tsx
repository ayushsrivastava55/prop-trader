"use client";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (!isConnected) {
    return (
      <div className="flex gap-2">
        {connectors.map((c) => (
          <button
            key={c.uid}
            onClick={() => connect({ connector: c })}
            disabled={!c.ready || isPending}
            className="px-3 py-2 rounded-md border text-sm hover:bg-accent"
          >
            {c.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => disconnect()}
      className="px-3 py-2 rounded-md border text-sm hover:bg-accent"
      title={address}
    >
      {shorten(address!)} · Disconnect
    </button>
  );
}
