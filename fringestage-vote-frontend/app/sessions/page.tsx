"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useContract } from "@/hooks/useContract";
import { designTokens } from "@/lib/design-tokens";
import { SessionCard } from "@/components/SessionCard";
import { Navbar } from "@/components/Navbar";

interface Session {
  id: number;
  title: string;
  venue: string;
  startTime: number;
  endTime: number;
  theaterCompany: string;
  voteCount: number;
  isActive: boolean;
  decryptionCompleted: boolean;
}

type TabType = "all" | "created" | "voted";

export default function SessionsPage() {
  const router = useRouter();
  const { account, isConnected } = useWallet();
  const { contract } = useContract();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [votedSessions, setVotedSessions] = useState<Set<number>>(new Set());
  const [endingSessionId, setEndingSessionId] = useState<number | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!contract) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const totalSessions = await contract.getTotalSessions();
        console.log("📊 Total sessions:", totalSessions.toString());

        const sessionPromises = [];
        for (let i = 0; i < totalSessions; i++) {
          sessionPromises.push(contract.getSessionInfo(i));
        }

        const sessionInfos = await Promise.all(sessionPromises);
        
        const fetchedSessions: Session[] = sessionInfos.map((info, index) => ({
          id: index,
          title: info[0],
          venue: info[1],
          startTime: Number(info[2]),
          endTime: Number(info[3]),
          theaterCompany: info[4], // address
          voteCount: Number(info[5]),
          isActive: info[6],
          decryptionCompleted: info[8], // Skip info[7] which is decryptionRequested
        }));

        setSessions(fetchedSessions);

        // Check which sessions the user has voted on
        if (account) {
          const votedChecks = await Promise.all(
            fetchedSessions.map(s => contract.hasVoted(s.id, account))
          );
          const voted = new Set(
            fetchedSessions.filter((_, i) => votedChecks[i]).map(s => s.id)
          );
          setVotedSessions(voted);
        }

        setError(null);
      } catch (err: any) {
        console.error("Failed to fetch sessions:", err);
        setError(err.message || "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [contract, account]);

  const filteredSessions = sessions.filter((session) => {
    if (activeTab === "all") return true;
    if (activeTab === "created") {
      return account && session.theaterCompany.toLowerCase() === account.toLowerCase();
    }
    if (activeTab === "voted") {
      return votedSessions.has(session.id);
    }
    return true;
  });

  const handleEndSession = async (sessionId: number) => {
    if (!contract) {
      setError("Contract not available");
      return;
    }

    try {
      setEndingSessionId(sessionId);
      setError(null);

      console.log(`🛑 Ending session ${sessionId}...`);
      const tx = await contract.endSession(sessionId);
      console.log("⏳ Transaction sent:", tx.hash);

      await tx.wait();
      console.log("✅ Session ended successfully");

      // Update local state
      setSessions(prevSessions =>
        prevSessions.map(s =>
          s.id === sessionId ? { ...s, isActive: false } : s
        )
      );
    } catch (err: any) {
      console.error("Failed to end session:", err);
      setError(err.message || "Failed to end session");
    } finally {
      setEndingSessionId(null);
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: "all", label: "All Sessions" },
    { id: "created", label: "My Created" },
    { id: "voted", label: "I Voted" },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: designTokens.colors.gray[50] }}>
      <Navbar />
      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 
              className="text-4xl font-bold mb-2"
              style={{ color: designTokens.colors.primary[600] }}
            >
              Performance Sessions
            </h1>
            <p style={{ color: designTokens.colors.gray[600] }}>
              Browse and vote on theater preview performances
            </p>
          </div>
          
          <button
            onClick={() => router.push("/sessions/create")}
            className="px-6 py-3 rounded-lg font-semibold transition-all duration-300"
            style={{
              backgroundColor: designTokens.colors.primary[600],
              color: "#ffffff",
            }}
          >
            + Create Session
          </button>
        </div>

        {!isConnected && (
          <div 
            className="p-6 rounded-lg mb-8"
            style={{ backgroundColor: designTokens.colors.accent[50] }}
          >
            <p style={{ color: designTokens.colors.gray[900] }}>
              Connect your wallet to vote on performances and create sessions
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b" style={{ borderColor: designTokens.colors.gray[200] }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-6 py-3 font-medium transition-all duration-200"
              style={{
                color: activeTab === tab.id ? designTokens.colors.primary[600] : designTokens.colors.gray[500],
                borderBottom: activeTab === tab.id ? `3px solid ${designTokens.colors.primary[600]}` : "3px solid transparent",
              }}
            >
              {tab.label}
              {tab.id === "created" && isConnected && (
                <span className="ml-2 text-sm">
                  ({sessions.filter(s => account && s.theaterCompany.toLowerCase() === account.toLowerCase()).length})
                </span>
              )}
              {tab.id === "voted" && isConnected && (
                <span className="ml-2 text-sm">({votedSessions.size})</span>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12">
            <p style={{ color: designTokens.colors.gray[600] }}>
              Loading sessions...
            </p>
          </div>
        )}

        {error && (
          <div 
            className="p-6 rounded-lg mb-8"
            style={{ backgroundColor: "#fee", color: "#c00" }}
          >
            {error}
          </div>
        )}

        {!loading && !error && filteredSessions.length === 0 && (
          <div className="text-center py-12">
            <p style={{ color: designTokens.colors.gray[600] }}>
              {activeTab === "all" && "No sessions available yet. Be the first to create one!"}
              {activeTab === "created" && "You haven't created any sessions yet."}
              {activeTab === "voted" && "You haven't voted on any sessions yet."}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map((session) => (
            <SessionCard 
              key={session.id}
              sessionId={session.id}
              title={session.title}
              venue={session.venue}
              startTime={session.startTime}
              endTime={session.endTime}
              voteCount={session.voteCount}
              isActive={session.isActive}
              theaterCompany={session.theaterCompany}
              currentAccount={account || undefined}
              onEndSession={handleEndSession}
              isEndingSession={endingSessionId === session.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
