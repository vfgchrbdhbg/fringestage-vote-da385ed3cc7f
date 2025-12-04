"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useContract } from "@/hooks/useContract";
import { useFhevm } from "@/fhevm/useFhevm";
import { userDecryptHandles } from "@/lib/fhevm-decrypt";

interface TheaterSession {
  sessionId: number;
  title: string;
  venue: string;
  startTime: number;
  endTime: number;
  voteCount: number;
  isActive: boolean;
  decryptionRequested: boolean;
  decryptionCompleted: boolean;
  isAuthorized: boolean;
  theaterCompany: string;
}

export default function TheaterDashboardPage() {
  const { account, isConnected, connectWallet, chainId, signer } = useWallet();
  const { contract, contractAddress } = useContract();
  const { fhevmInstance } = useFhevm();

  const [sessions, setSessions] = useState<TheaterSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingSession, setProcessingSession] = useState<number | null>(null);
  const [processingAction, setProcessingAction] = useState<string>("");

  useEffect(() => {
    const fetchSessions = async () => {
      if (!contract || !account) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const totalSessions = await contract.getTotalSessions();
        const sessionCount = Number(totalSessions);

        if (sessionCount === 0) {
          setSessions([]);
          setLoading(false);
          return;
        }

        const sessionPromises = [];
        for (let i = 0; i < sessionCount; i++) {
          sessionPromises.push(
            (async () => {
              const info = await contract.getSessionInfo(i);
              const isAuthorized = await contract.isAuthorized(i, account);
              
              return {
                sessionId: i,
                title: info.title,
                venue: info.venue,
                startTime: Number(info.startTime),
                endTime: Number(info.endTime),
                voteCount: Number(info.voteCount),
                isActive: info.isActive,
                decryptionRequested: info.decryptionRequested,
                decryptionCompleted: info.decryptionCompleted,
                isAuthorized,
                theaterCompany: info.theaterCompany,
              };
            })()
          );
        }

        const allSessions = await Promise.all(sessionPromises);
        
        // Filter to only show sessions created by current user
        const mySessions = allSessions.filter(
          (s) => s.theaterCompany.toLowerCase() === account.toLowerCase()
        );
        setSessions(mySessions);
      } catch (err: any) {
        console.error("Failed to fetch sessions:", err);
        setError(err.message || "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [contract, account]);

  const handleEndSession = async (sessionId: number) => {
    if (!contract) return;

    try {
      setProcessingSession(sessionId);
      setProcessingAction("Ending session...");
      setError(null);

      const tx = await contract.endSession(sessionId);
      console.log("End session tx submitted:", tx.hash);

      await tx.wait();
      console.log("✓ Session ended");

      // Refresh sessions
      const updatedSessions = sessions.map((s) =>
        s.sessionId === sessionId ? { ...s, isActive: false } : s
      );
      setSessions(updatedSessions);
    } catch (err: any) {
      console.error("Failed to end session:", err);
      setError(err.message || "Failed to end session");
    } finally {
      setProcessingSession(null);
      setProcessingAction("");
    }
  };

  const handleRequestDecryption = async (sessionId: number) => {
    if (!contract) return;

    try {
      setProcessingSession(sessionId);
      setProcessingAction("Requesting decryption...");
      setError(null);

      const tx = await contract.requestDecryption(sessionId);
      console.log("Decryption request submitted:", tx.hash);

      await tx.wait();
      console.log("✓ Decryption request confirmed");

      // Refresh sessions
      const updatedSessions = sessions.map((s) =>
        s.sessionId === sessionId ? { ...s, decryptionRequested: true } : s
      );
      setSessions(updatedSessions);
    } catch (err: any) {
      console.error("Failed to request decryption:", err);
      setError(err.message || "Failed to request decryption");
    } finally {
      setProcessingSession(null);
      setProcessingAction("");
    }
  };

  const handleDecryptAndStore = async (sessionId: number) => {
    if (!contract || !fhevmInstance || !account || !signer) {
      setError("Contract, FHEVM instance, signer, or account not ready");
      return;
    }

    // Only allow in mock/local environment
    if (chainId !== 31337) {
      setError("Direct decryption is only available in local/mock mode. On Sepolia, the Gateway will automatically decrypt and store results.");
      return;
    }

    try {
      setProcessingSession(sessionId);
      setProcessingAction("Fetching encrypted aggregates...");
      setError(null);

      const session = sessions.find((s) => s.sessionId === sessionId);
      if (!session) {
        throw new Error("Session not found");
      }

      // Get encrypted handles
      const [plotHandle, perfHandle, stageHandle, paceHandle] = await contract.getEncryptedAggregates(sessionId);

      console.log("📊 Got encrypted handles:", {
        plotHandle,
        perfHandle,
        stageHandle,
        paceHandle,
      });

      // Check signer is available
      if (!signer) {
        throw new Error("Wallet not connected");
      }

      // Use userDecrypt with signature (not publicDecrypt)
      setProcessingAction("Decrypting with authorization...");
      const [plotTotal, perfTotal, stageTotal, paceTotal] = await userDecryptHandles(
        fhevmInstance,
        contractAddress!,
        [plotHandle, perfHandle, stageHandle, paceHandle],
        signer
      );

      console.log("✅ Decryption complete:", {
        plotTotal: plotTotal.toString(),
        perfTotal: perfTotal.toString(),
        stageTotal: stageTotal.toString(),
        paceTotal: paceTotal.toString(),
      });

      // Store on-chain
      setProcessingAction("Storing decrypted results on-chain...");
      const storeTx = await contract.storeDecryptedResults(
        sessionId,
        plotTotal,
        perfTotal,
        stageTotal,
        paceTotal
      );

      console.log("📝 Store tx submitted:", storeTx.hash);
      await storeTx.wait();
      console.log("✅ Results stored on-chain!");

      // Refresh sessions
      const updatedSessions = sessions.map((s) =>
        s.sessionId === sessionId ? { ...s, decryptionCompleted: true } : s
      );
      setSessions(updatedSessions);
    } catch (err: any) {
      console.error("Failed to decrypt and store:", err);
      setError(err.message || "Failed to decrypt and store results");
    } finally {
      setProcessingSession(null);
      setProcessingAction("");
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-amber-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-3xl font-bold mb-4">Please Connect Your Wallet</h1>
          <button
            onClick={() => connectWallet()}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-amber-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary-700">
            FringeStage Vote
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/sessions" className="text-gray-600 hover:text-primary-600">
              All Sessions
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">
                {account?.slice(0, 6)}...{account?.slice(-4)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Theater Company Dashboard</h1>
          <p className="text-gray-600">
            View and manage your authorized performance sessions
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 rounded-lg p-4 mb-8">
            <p className="text-red-800">❌ {error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading your sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="text-6xl mb-4">🎭</div>
            <h2 className="text-2xl font-bold mb-4">No Sessions Created</h2>
            <p className="text-gray-600 mb-6">
              You haven't created any performance sessions yet.
            </p>
            <Link
              href="/sessions/create"
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              + Create Your First Session
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Session
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Venue
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Votes
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sessions.map((session) => {
                    const now = Date.now() / 1000;
                    const hasEnded = now >= session.endTime || !session.isActive;
                    const hasEnoughVotes = session.voteCount >= 1;
                    const isProcessing = processingSession === session.sessionId;

                    // Determine current stage
                    let stage = "";
                    let nextAction = null;

                    if (!hasEnded) {
                      stage = "🟢 Active";
                      nextAction = (
                        <button
                          onClick={() => handleEndSession(session.sessionId)}
                          disabled={isProcessing}
                          className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400"
                        >
                          End Session
                        </button>
                      );
                    } else if (!session.decryptionRequested) {
                      stage = hasEnoughVotes ? "⏳ Ready to Decrypt" : `⏸️ Need at least 1 vote`;
                      if (hasEnoughVotes) {
                        nextAction = (
                          <button
                            onClick={() => handleRequestDecryption(session.sessionId)}
                            disabled={isProcessing}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                          >
                            Request Decrypt
                          </button>
                        );
                      }
                    } else if (!session.decryptionCompleted) {
                      stage = "🔐 Decryption Requested";
                      if (chainId === 31337) {
                        nextAction = (
                          <button
                            onClick={() => handleDecryptAndStore(session.sessionId)}
                            disabled={isProcessing}
                            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
                          >
                            Decrypt & Store
                          </button>
                        );
                      } else {
                        nextAction = (
                          <span className="text-xs text-gray-500">
                            Waiting for Gateway...
                          </span>
                        );
                      }
                    } else {
                      stage = "✅ Complete";
                    }

                    return (
                      <tr key={session.sessionId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{session.title}</div>
                          <div className="text-sm text-gray-500">
                            ID: {session.sessionId}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{session.venue}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              hasEnded
                                ? "bg-gray-100 text-gray-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {hasEnded ? "Ended" : "Active"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {session.voteCount}
                          </div>
                          <div className="text-xs text-gray-500">
                            {session.voteCount >= 1 ? "✓ Ready" : "Need at least 1 vote"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium">{stage}</div>
                          {isProcessing && (
                            <div className="text-xs text-blue-600 mt-1">
                              {processingAction}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Link
                            href={`/results/${session.sessionId}`}
                            className="inline-block px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                          >
                            View Results
                          </Link>
                          {nextAction}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <span>ℹ️</span>
            <span>{chainId === 31337 ? "Mock Mode Workflow" : "Production Workflow"}</span>
          </h3>
          {chainId === 31337 ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">🔵 One-Click Decryption Available</h4>
                <p className="text-sm text-blue-800">
                  You're on localhost (Mock Mode). You can decrypt results directly from this page!
                </p>
              </div>
              <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                <li>Wait for at least <strong>1 vote</strong> to be submitted</li>
                <li>Click <strong>"End Session"</strong> to close voting</li>
                <li>Click <strong>"Request Decrypt"</strong> to mark session for decryption</li>
                <li>Click <strong>"Decrypt & Store"</strong> to decrypt and save results on-chain</li>
                <li>View the radar chart on the Results page!</li>
              </ol>
            </div>
          ) : (
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Sessions must have at least <strong>1 vote</strong> before decryption</li>
              <li>• Click "End Session" when voting period is complete</li>
              <li>• Click "Request Decrypt" to submit decryption request to Sepolia Gateway</li>
              <li>• Gateway will automatically decrypt and store results within ~5 minutes</li>
              <li>• Individual votes remain encrypted—only aggregated totals are decrypted</li>
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

