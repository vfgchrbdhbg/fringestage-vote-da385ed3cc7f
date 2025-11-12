"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";

export function Navbar() {
  const pathname = usePathname();
  const { account, isConnected, connectWallet, isConnecting } = useWallet();

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/sessions", label: "Sessions" },
    { href: "/theater/dashboard", label: "Theater Dashboard" },
  ];

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-primary-700 hover:text-primary-800">
            🎭 FringeStage Vote
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "text-primary-600 border-b-2 border-primary-600"
                    : "text-gray-600 hover:text-primary-600"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Wallet Connection */}
          <div className="flex items-center gap-4">
            {isConnected && account ? (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>
            ) : (
              <button
                onClick={() => connectWallet()}
                disabled={isConnecting}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center gap-4 mt-4 overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium whitespace-nowrap px-3 py-1 rounded transition-colors ${
                pathname === item.href
                  ? "bg-primary-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}


