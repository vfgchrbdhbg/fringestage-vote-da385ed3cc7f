import { ReactNode } from "react";

export default function VoteLayout({ children }: { children: ReactNode }) {
  return children;
}

// Generate static params for build time
export async function generateStaticParams() {
  // For static export, we need to return at least one path
  // In production, you could fetch actual session IDs from an API or config
  // For now, we'll generate placeholder pages for session IDs 0-9
  return Array.from({ length: 10 }, (_, i) => ({
    sessionId: i.toString(),
  }));
}

