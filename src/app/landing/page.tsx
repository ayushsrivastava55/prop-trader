import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-5xl sm:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-6">
              PropTrader AI
            </h1>
            <p className="text-xl sm:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Automated DeFi trading on Hedera powered by Pyth oracles and Vincent PKP for non-custodial execution
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href="/dashboard"
                className="px-8 py-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
              >
                Launch App
              </Link>
              <a
                href="https://docs.hedera.com"
                target="_blank"
                rel="noreferrer"
                className="px-8 py-4 rounded-lg border border-slate-700 text-slate-300 font-semibold hover:bg-slate-800 transition-all"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-white mb-16">
          Why PropTrader AI?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon="🔐"
            title="Non-Custodial"
            description="Your funds stay in your PKP wallet. Execute trades without giving up custody using Vincent PKP technology."
          />
          <FeatureCard
            icon="⚡"
            title="Real-Time Oracles"
            description="Powered by Pyth Network for accurate, low-latency price feeds directly on-chain."
          />
          <FeatureCard
            icon="🤖"
            title="Automated Trading"
            description="Set your strategy parameters and let the bot execute profitable trades 24/7 on SaucerSwap."
          />
          <FeatureCard
            icon="🌐"
            title="Hedera Network"
            description="Fast, low-cost transactions on Hedera with enterprise-grade security and sustainability."
          />
          <FeatureCard
            icon="📊"
            title="Strategy Dashboard"
            description="Monitor spreads, track trades, and view real-time performance metrics in one place."
          />
          <FeatureCard
            icon="🔄"
            title="Arbitrage Ready"
            description="Detect and execute arbitrage opportunities between DEX prices and Pyth oracle feeds."
          />
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-white mb-16">
          How It Works
        </h2>
        <div className="grid md:grid-cols-4 gap-6">
          <StepCard number="1" title="Connect PKP" description="Link your Vincent PKP wallet for non-custodial execution" />
          <StepCard number="2" title="Configure Strategy" description="Set spread thresholds, slippage, and position sizes" />
          <StepCard number="3" title="Start Trading" description="Activate the bot to monitor and execute trades automatically" />
          <StepCard number="4" title="Track Performance" description="View trade history and analytics in real-time" />
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-4 gap-8 text-center">
          <StatCard value="<1s" label="Avg Execution Time" />
          <StatCard value="$0.01" label="Avg Gas Cost" />
          <StatCard value="100%" label="Non-Custodial" />
          <StatCard value="24/7" label="Automated" />
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-600/10 border border-blue-500/20 p-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Start Trading?
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            Join the future of automated DeFi trading on Hedera
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-8 py-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            Launch App Now
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-400 text-sm">
          <p>Built on Hedera • Powered by Pyth Network • Secured by Vincent PKP</p>
          <p className="mt-2">© 2025 PropTrader AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-6 hover:border-slate-700 transition-all">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
        {value}
      </div>
      <div className="text-slate-400">{label}</div>
    </div>
  );
}
