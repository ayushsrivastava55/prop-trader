"use client";
import { create } from "zustand";

type Trade = {
  txHash: string;
  path: "vincent" | "server" | "wallet";
  amountInWei?: string;
  tokenIn?: string;
  tokenOut?: string;
  recipient?: string;
  at: number;
};

type TradesState = {
  trades: Trade[];
  addTrade: (t: Trade) => void;
  clear: () => void;
};

export const useTradesStore = create<TradesState>((set) => ({
  trades: [],
  addTrade: (t) => set((s) => ({ trades: [t, ...s.trades].slice(0, 20) })),
  clear: () => set({ trades: [] }),
}));
