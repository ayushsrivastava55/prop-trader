"use client";
import { create } from "zustand";

export type ArbitrageParams = {
  spreadBps: number; // execute when DEX vs Pyth spread > spreadBps
  maxPositionPct: number; // % of capital per trade
  maxSlippageBps: number; // slippage tolerance
};

export type StrategyState = {
  isActive: boolean;
  arbitrage: ArbitrageParams;
  setActive: (on: boolean) => void;
  setArbitrage: (p: Partial<ArbitrageParams>) => void;
};

const defaults: ArbitrageParams = {
  spreadBps: 100, // 1%
  maxPositionPct: 10, // 10%
  maxSlippageBps: 50, // 0.5%
};

export const useStrategyStore = create<StrategyState>((set) => ({
  isActive: false,
  arbitrage: defaults,
  setActive: (on) => set({ isActive: on }),
  setArbitrage: (p) =>
    set((s) => ({ arbitrage: { ...s.arbitrage, ...sanitize(p) } })),
}));

function sanitize(p: Partial<ArbitrageParams>): Partial<ArbitrageParams> {
  const out: Partial<ArbitrageParams> = {};
  if (p.spreadBps !== undefined)
    out.spreadBps = clamp(Math.round(p.spreadBps), 10, 2000);
  if (p.maxPositionPct !== undefined)
    out.maxPositionPct = clamp(Math.round(p.maxPositionPct), 1, 100);
  if (p.maxSlippageBps !== undefined)
    out.maxSlippageBps = clamp(Math.round(p.maxSlippageBps), 1, 1000);
  return out;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
