"use client";

import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useFhevm } from "@/fhevm/useFhevm";
import { Navbar } from "@/components/Navbar";

export default function HomePage() {
  const { isConnected, connectWallet, isConnecting } = useWallet();
  const { isInitialized, isMockMode } = useFhevm();

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-amber-50">
      <Navbar />

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto animate-fade-in">
          <h2 className="text-5xl font-extrabold text-gray-900 mb-6">
            Anonymous Voting for <span className="text-primary-600">Theater Previews</span>
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Rate performances across 4 dimensions with full privacy. Your votes are encrypted
            on-chain, and only aggregated results are revealed.
          </p>

          {!isConnected && (
            <button
              onClick={() => connectWallet()}
              disabled={isConnecting}
              className="px-8 py-4 text-lg bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet to Get Started"}
            </button>
          )}

          {isConnected && !isInitialized && (
            <div className="mt-8 p-4 bg-amber-100 border border-amber-400 rounded-lg">
              <p className="text-amber-800">
                ⚠️ Initializing FHEVM... Please wait.
              </p>
            </div>
          )}

          {isConnected && isInitialized && (
            <div className="mt-8 flex gap-4 justify-center">
              <Link
                href="/sessions"
                className="px-8 py-4 text-lg bg-primary-600 text-white rounded-xl hover:bg-primary-700 shadow-lg hover:shadow-xl transition-all"
              >
                Browse Sessions
              </Link>
              {isMockMode && (
                <span className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm self-center">
                  Mock Mode (Local)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
          <div className="bg-white p-6 rounded-xl shadow-md animate-slide-up">
            <div className="text-3xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold mb-2">Anonymous & Encrypted</h3>
            <p className="text-gray-600 text-sm">
              Your votes are fully encrypted on-chain using FHEVM technology
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2">Multi-Dimensional</h3>
            <p className="text-gray-600 text-sm">
              Rate performances across 4 dimensions: Plot, Acting, Visuals, Pacing
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="text-3xl mb-4">📈</div>
            <h3 className="text-lg font-semibold mb-2">Aggregated Insights</h3>
            <p className="text-gray-600 text-sm">
              Theater companies see trends and patterns, not individual votes
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <div className="text-3xl mb-4">🎭</div>
            <h3 className="text-lg font-semibold mb-2">Privacy-First</h3>
            <p className="text-gray-600 text-sm">
              Powered by Zama's FHEVM for true on-chain privacy
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-1">Connect Wallet</h4>
                <p className="text-gray-600">
                  Connect your Web3 wallet (MetaMask or compatible)
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-1">Browse Sessions</h4>
                <p className="text-gray-600">
                  Find active theater performances or scan a QR code at the venue
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-1">Submit Your Vote</h4>
                <p className="text-gray-600">
                  Rate across 4 dimensions and optionally add a short comment
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-lg">
                4
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-1">View Results</h4>
                <p className="text-gray-600">
                  See aggregated statistics after the session ends (radar charts, word clouds)
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600 text-sm">
          <p className="mb-2">
            Data is encrypted on-chain. No personal information is stored.
          </p>
          <p>
            Powered by{" "}
            <a
              href="https://www.zama.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              Zama FHEVM
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

