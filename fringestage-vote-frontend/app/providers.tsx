"use client";

import { ReactNode } from "react";
import { WalletProvider } from "@/hooks/useWallet";
import { FhevmProvider } from "@/fhevm/useFhevm";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <FhevmProvider>{children}</FhevmProvider>
    </WalletProvider>
  );
}

