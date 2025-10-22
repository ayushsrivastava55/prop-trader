"use client";
import { useQuery } from "@tanstack/react-query";

export type PythPricePoint = {
  id: string;
  price: number; // normalized price
  conf: number; // confidence interval
  publishTime: number; // unix seconds
};

async function fetchPrice(id: string): Promise<PythPricePoint | null> {
  const res = await fetch(`/api/pyth?id=${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  const feed = Array.isArray(data) ? data[0] : data?.[0];
  const priceData = feed?.price?.price;
  const expo = feed?.price?.expo; // e.g. -8
  const conf = feed?.price?.conf;
  const publishTime = feed?.price?.publishTime;
  if (typeof priceData !== "number" || typeof expo !== "number") return null;
  const normalized = priceData * Math.pow(10, expo);
  const normalizedConf = typeof conf === "number" ? conf * Math.pow(10, expo) : 0;
  return { id, price: normalized, conf: normalizedConf, publishTime };
}

export function usePythPrice(id: string, refetchMs = 2000) {
  return useQuery({
    queryKey: ["pyth", id],
    queryFn: () => fetchPrice(id),
    refetchInterval: refetchMs,
  });
}
