import { ReactNode } from "react";

export default function ResultsLayout({ children }: { children: ReactNode }) {
  return children;
}

// Generate static params for build time
export async function generateStaticParams() {
  // Generate placeholder pages for session IDs 0-9
  return Array.from({ length: 10 }, (_, i) => ({
    sessionId: i.toString(),
  }));
}

