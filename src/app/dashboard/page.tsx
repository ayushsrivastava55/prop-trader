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
import StrategyStatus from "@/components/strategy-status";

export default function DashboardPage() {
  return (
    <div className="min-h-screen p-8 sm:p-12 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            PropTrader AI
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Automated DeFi Trading Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <VincentConnectButton />
          <WalletButton />
        </div>
      </header>

      <main className="space-y-6">
        {/* Price Cards */}
        <section className="grid gap-4 md:grid-cols-3">
          <PythPriceCard id={PYTH_FEEDS.ETH_USD} label="ETH / USD" />
          <PythPriceCard id={PYTH_FEEDS.BTC_USD} label="BTC / USD" />
          <PythPriceCard id={PYTH_FEEDS.USDC_USD} label="USDC / USD" />
        </section>

        {/* Status & Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <SessionStatus />
          <StrategyStatus />
        </div>

        {/* Trading Sections */}
        <ExecuteSwapPrep />
        <AutoExecutor />

        {/* Configuration */}
        <div className="grid gap-6 lg:grid-cols-2">
          <StrategyConfig />
          <SignalTester />
        </div>

        <StartStop />
        
        {/* Dev Tools */}
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer font-medium">Developer Tools</summary>
          <div className="mt-4">
            <ExecuteNativeSend />
          </div>
        </details>
      </main>
    </div>
  );
}
