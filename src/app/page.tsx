import WalletButton from "@/components/wallet-button";
import VincentConnectButton from "@/components/vincent-connect-button";
import PythPriceCard from "@/components/pyth-price-card";
import StrategyConfig from "@/components/strategy-config";
import StartStop from "@/components/start-stop";
import { PYTH_FEEDS } from "@/lib/pyth";
import SignalTester from "@/components/signal-tester";
import SessionStatus from "@/components/session-status";
import ExecuteNativeSend from "@/components/execute-native-send";
import ExecuteSwapPrep from "@/components/execute-swap-prep";
import AutoExecutor from "@/components/auto-executor";

export default function Home() {
  return (
    <div className="min-h-screen p-8 sm:p-12">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">PropTrader AI</h1>
        <div className="flex items-center gap-2">
          <VincentConnectButton />
          <WalletButton />
        </div>
      </header>

      <main className="mt-10 space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-medium">Overview</h2>
          <p className="text-sm text-muted-foreground">
            Connect your wallet to create a delegated session and enable automated trading.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <PythPriceCard id={PYTH_FEEDS.ETH_USD} label="ETH / USD" />
          <PythPriceCard id={PYTH_FEEDS.BTC_USD} label="BTC / USD" />
          <PythPriceCard id={PYTH_FEEDS.USDC_USD} label="USDC / USD" />
        </section>

        <SessionStatus />
        <ExecuteNativeSend />
        <ExecuteSwapPrep />

        <StrategyConfig />
        <SignalTester />

        <StartStop />
        <AutoExecutor />
      </main>
    </div>
  );
}
