"use client";
import { usePythPrice } from "@/hooks/usePyth";

export default function PythPriceCard({ id, label }: { id: string; label: string }) {
  const { data, isLoading, isError } = usePythPrice(id, 2000);

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-medium">{label}</h3>
        <span className="text-xs text-muted-foreground">
          {data?.publishTime ? new Date(data.publishTime * 1000).toLocaleTimeString() : ""}
        </span>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {isError && <p className="text-sm text-destructive">Failed to load price</p>}
      {!isLoading && !isError && data && (
        <div className="mt-2">
          <div className="text-2xl font-semibold">
            {data.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground">± {Math.abs(data.conf).toFixed(2)}</div>
        </div>
      )}
    </div>
  );
}
