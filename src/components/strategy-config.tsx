"use client";
import { useStrategyStore } from "@/store/strategy";

export default function StrategyConfig() {
  const { arbitrage, setArbitrage } = useStrategyStore();

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Arbitrage Strategy</h3>
        <span className="text-xs text-muted-foreground">DEX vs Pyth spread</span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <LabeledNumber
          label="Spread Threshold (%)"
          title="Execute when DEX price deviates from Pyth price by at least this percent (after fees)."
          value={(arbitrage.spreadBps / 100).toString()}
          min={0.1}
          max={20}
          step={0.1}
          onChange={(v) => setArbitrage({ spreadBps: Math.round(Number(v) * 100) })}
        />
        <LabeledNumber
          label="Max Position Size (%)"
          title="Maximum percent of your capital to use in a single trade."
          value={arbitrage.maxPositionPct.toString()}
          min={1}
          max={100}
          step={1}
          onChange={(v) => setArbitrage({ maxPositionPct: Math.round(Number(v)) })}
        />
        <LabeledNumber
          label="Max Slippage (%)"
          title="Maximum allowed slippage compared to quoted price."
          value={(arbitrage.maxSlippageBps / 100).toString()}
          min={0.1}
          max={10}
          step={0.1}
          onChange={(v) => setArbitrage({ maxSlippageBps: Math.round(Number(v) * 100) })}
        />
      </div>
    </div>
  );
}

function LabeledNumber({
  label,
  title,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  title?: string;
  value: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm" title={title}>
      <div className="mb-1 text-muted-foreground">{label}</div>
      <input
        type="number"
        className="w-full rounded-md border px-2 py-1"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
