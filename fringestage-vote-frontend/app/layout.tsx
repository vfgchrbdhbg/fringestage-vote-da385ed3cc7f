import type { Metadata } from "next";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Dynamically import Providers with no SSR to avoid fhevmjs WASM build issues
const Providers = dynamic(() => import("./providers").then(mod => ({ default: mod.Providers })), {
  ssr: false,
});

export const metadata: Metadata = {
  title: "FringeStage Vote - Anonymous Theater Voting",
  description: "Anonymous voting dApp for small theater preview performances",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

