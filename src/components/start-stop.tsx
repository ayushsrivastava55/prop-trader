"use client";
import { useStrategyStore } from "@/store/strategy";

export default function StartStop() {
  const { isActive, setActive } = useStrategyStore();

  const onToggle = () => {
    if (!isActive) {
      const ok = window.confirm(
        "Start trading now? The agent may execute trades according to your configured risk parameters."
      );
      if (ok) setActive(true);
    } else {
      const ok = window.confirm(
        "Pause trading? No pending trades will execute while paused. You can resume anytime."
      );
      if (ok) setActive(false);
    }
  };

  return (
    <div className="rounded-lg border p-4 flex items-center justify-between">
      <div>
        <h3 className="font-medium">Trading Control</h3>
        <p className="text-sm text-muted-foreground">
          Status: {isActive ? "Active" : "Paused"}
        </p>
      </div>
      <button
        onClick={onToggle}
        className={`px-3 py-2 rounded-md border text-sm hover:bg-accent ${
          isActive ? "border-red-500 text-red-600" : "border-green-500 text-green-600"
        }`}
      >
        {isActive ? "Pause" : "Start"}
      </button>
    </div>
  );
}
