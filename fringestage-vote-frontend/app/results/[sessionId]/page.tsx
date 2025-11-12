"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useContract } from "@/hooks/useContract";
import { useFhevm } from "@/fhevm/useFhevm";
import { designTokens } from "@/lib/design-tokens";
import RadarChart from "@/components/RadarChart";
import { Navbar } from "@/components/Navbar";
import { userDecryptHandles } from "@/lib/fhevm-decrypt";

interface SessionInfo {
  title: string;
  venue: string;
  startTime: number;
  endTime: number;
  theaterCompany: string;
  voteCount: number;
  isActive: boolean;
  decryptionRequested: boolean;
  decryptionCompleted: boolean;
}

interface DecryptedResults {
  plotTension: number;
  performance: number;
  stageDesign: number;
  pacing: number;
}

export default function ResultsPage({ params }: { params: { sessionId: string } }) {
  const sessionId = parseInt(params.sessionId);
  const { account, isConnected, connectWallet, chainId, signer } = useWallet();
  const { contract, contractAddress } = useContract();
  const { fhevmInstance, isInitialized } = useFhevm();

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [decryptedResults, setDecryptedResults] = useState<DecryptedResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!contract) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const info = await contract.getSessionInfo(sessionId);
        setSessionInfo({
          title: info[0],
          venue: info[1],
          startTime: Number(info[2]),
          endTime: Number(info[3]),
          theaterCompany: info[4], // address type
          voteCount: Number(info[5]),
          isActive: info[6],
          decryptionRequested: info[7],
          decryptionCompleted: info[8],
        });

        // If decryption is completed, fetch on-chain decrypted results
        if (info[8]) {
          try {
            const results = await contract.getDecryptedResults(sessionId);
            setDecryptedResults({
              plotTension: Number(results[4]), // avgPlotTension
              performance: Number(results[5]), // avgPerformance
              stageDesign: Number(results[6]), // avgStageDesign
              pacing: Number(results[7]), // avgPacing
            });
            console.log("✓ Loaded decrypted results from chain");
          } catch (decryptErr: any) {
            console.warn("Failed to fetch decrypted results:", decryptErr);
            // Not a critical error - results might not be stored yet
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch session data:", err);
        setError(err.message || "Failed to load session");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contract, sessionId, account]);

  const handleEndSession = async () => {
    if (!contract) return;

    try {
      setProcessing(true);
      setProcessingAction("Ending session...");
      setError(null);

      const tx = await contract.endSession(sessionId);
      console.log("End session tx submitted:", tx.hash);

      await tx.wait();
      console.log("✓ Session ended");

      // Refresh page
      window.location.reload();
    } catch (err: any) {
      console.error("Failed to end session:", err);
      setError(err.message || "Failed to end session");
    } finally {
      setProcessing(false);
      setProcessingAction("");
    }
  };

  const handleRequestDecryption = async () => {
    if (!contract) return;

    try {
      setProcessing(true);
      setProcessingAction("Requesting decryption...");
      setError(null);

      const tx = await contract.requestDecryption(sessionId);
      console.log("Decryption request submitted:", tx.hash);

      await tx.wait();
      console.log("✓ Decryption request confirmed");

      // Refresh page
      window.location.reload();
    } catch (err: any) {
      console.error("Failed to request decryption:", err);
      setError(err.message || "Failed to request decryption");
    } finally {
      setProcessing(false);
      setProcessingAction("");
    }
  };

  const handleDecryptAndStore = async () => {
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
      setProcessing(true);
      setProcessingAction("Fetching encrypted aggregates...");
      setError(null);

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

      // Refresh page to show results
      window.location.reload();
    } catch (err: any) {
      console.error("Failed to decrypt and store:", err);
      setError(err.message || "Failed to decrypt and store results");
    } finally {
      setProcessing(false);
      setProcessingAction("");
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: designTokens.colors.gray[50] }}>
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-3xl font-bold mb-4" style={{ color: designTokens.colors.gray[900] }}>
            Please Connect Your Wallet
          </h1>
          <button
            onClick={() => connectWallet()}
            className="px-6 py-3 rounded-lg font-semibold"
            style={{ backgroundColor: designTokens.colors.primary[600], color: "#ffffff" }}
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: designTokens.colors.gray[50] }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4 inline-block" style={{ borderColor: designTokens.colors.primary[600] }}></div>
          <p style={{ color: designTokens.colors.gray[600] }}>Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: designTokens.colors.gray[50] }}>
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-2xl font-bold mb-4" style={{ color: designTokens.colors.error }}>
            Error Loading Session
          </h1>
          <p style={{ color: designTokens.colors.gray[600] }}>{error || "Session not found"}</p>
          <Link
            href="/sessions"
            className="mt-6 inline-block px-6 py-3 rounded-lg font-semibold"
            style={{ backgroundColor: designTokens.colors.primary[600], color: "#ffffff" }}
          >
            Back to Sessions
          </Link>
        </div>
      </div>
    );
  }

  // decryptedResults now contains average scores directly from contract
  const averages = decryptedResults;

  const getStatusLabel = () => {
    if (sessionInfo.isActive) return "Active";
    if (sessionInfo.decryptionCompleted) return "Decrypted";
    return "Ended";
  };

  const getStatusColor = () => {
    if (sessionInfo.isActive) return designTokens.colors.success;
    if (sessionInfo.decryptionCompleted) return designTokens.colors.info;
    return designTokens.colors.gray[900];
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: designTokens.colors.gray[50] }}>
      <Navbar />
      <div className="py-12 px-4">
        {/* Header */}
        <header className="border-b mb-8 pb-4" style={{ borderColor: designTokens.colors.gray[200] }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/sessions" style={{ color: designTokens.colors.primary[600] }}>
            ← Back to Sessions
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" style={{ color: designTokens.colors.gray[600] }}>
              Home
            </Link>
            {account && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium" style={{ color: designTokens.colors.gray[900] }}>
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* Session Info */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: designTokens.colors.primary[600] }}>
            {sessionInfo.title}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm" style={{ color: designTokens.colors.gray[600] }}>
            <span>📍 {sessionInfo.venue}</span>
            <span>📅 {new Date(sessionInfo.startTime * 1000).toLocaleString()} - {new Date(sessionInfo.endTime * 1000).toLocaleString()}</span>
            <span>🗳️ {sessionInfo.voteCount} votes</span>
            <span className="font-semibold" style={{ color: getStatusColor() }}>
              Status: {getStatusLabel()}
            </span>
          </div>
        </div>

        {/* Decrypted Results */}
        {decryptedResults && averages ? (
          <div className="space-y-8">
            <div className="p-8 rounded-xl" style={{ backgroundColor: designTokens.colors.primary[50] }}>
              <h2 className="text-2xl font-bold mb-6" style={{ color: designTokens.colors.gray[900] }}>
                Average Audience Ratings
              </h2>
              
              <RadarChart data={averages} maxValue={100} />

              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(averages).map(([key, value]) => (
                  <div key={key} className="p-4 rounded-lg text-center" style={{ backgroundColor: "#ffffff" }}>
                    <div className="text-3xl font-bold mb-1" style={{ color: designTokens.colors.primary[600] }}>
                      {value}
                    </div>
                    <div className="text-sm capitalize" style={{ color: designTokens.colors.gray[600] }}>
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-lg" style={{ backgroundColor: designTokens.colors.accent[50] }}>
              <h3 className="font-semibold mb-2" style={{ color: designTokens.colors.gray[900] }}>
                About These Results
              </h3>
              <ul className="text-sm space-y-1" style={{ color: designTokens.colors.gray[700] }}>
                <li>• Ratings are aggregated from {sessionInfo.voteCount} encrypted votes</li>
                <li>• Individual votes remain private and cannot be traced</li>
                <li>• Only authorized theater companies can decrypt these results</li>
                <li>• Scores range from 0-100 for each dimension</li>
              </ul>
            </div>
          </div>
        ) : sessionInfo.isActive ? (
          <div className="p-8 rounded-xl text-center" style={{ backgroundColor: designTokens.colors.primary[50] }}>
            <h2 className="text-2xl font-bold mb-4" style={{ color: designTokens.colors.gray[900] }}>
              Session is Active
            </h2>
            <p style={{ color: designTokens.colors.gray[600] }}>
              Results will be available after the session ends and decryption is requested.
            </p>
          </div>
        ) : sessionInfo.voteCount < 1 ? (
          <div className="p-8 rounded-xl text-center" style={{ backgroundColor: designTokens.colors.warning, color: "#ffffff" }}>
            <h2 className="text-2xl font-bold mb-4">Insufficient Votes</h2>
            <p>
              This session needs at least 1 vote before results can be decrypted.
              <br />
              Current votes: {sessionInfo.voteCount}
            </p>
          </div>
        ) : account?.toLowerCase() === sessionInfo.theaterCompany.toLowerCase() ? (
          <div className="p-8 rounded-xl" style={{ backgroundColor: designTokens.colors.primary[50] }}>
            <h2 className="text-2xl font-bold mb-4" style={{ color: designTokens.colors.gray[900] }}>
              Decrypt Results
            </h2>
            <p className="mb-6" style={{ color: designTokens.colors.gray[700] }}>
              This session has {sessionInfo.voteCount} encrypted votes. As the theater company, you can decrypt the aggregated results.
            </p>
            
            {error && (
              <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: "#fee", color: "#c00" }}>
                {error}
              </div>
            )}

            {processing && (
              <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: "#e3f2fd", color: "#1565c0" }}>
                {processingAction}
              </div>
            )}
            
            <div className="bg-white p-6 rounded-lg space-y-4">
              <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: designTokens.colors.gray[200] }}>
                <div>
                  <h3 className="font-semibold" style={{ color: designTokens.colors.gray[900] }}>
                    Current Status
                  </h3>
                  <p className="text-sm mt-1" style={{ color: designTokens.colors.gray[600] }}>
                    {sessionInfo.decryptionRequested 
                      ? "🔐 Decryption Requested" 
                      : "⏳ Ready to Request Decryption"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {!sessionInfo.decryptionRequested && (
                  <button
                    onClick={handleRequestDecryption}
                    disabled={processing}
                    className="w-full px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
                    style={{ backgroundColor: "#2196f3", color: "#ffffff" }}
                  >
                    {processing ? "Processing..." : "Request Decryption"}
                  </button>
                )}

                {sessionInfo.decryptionRequested && chainId === 31337 && (
                  <button
                    onClick={handleDecryptAndStore}
                    disabled={processing}
                    className="w-full px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
                    style={{ backgroundColor: "#9c27b0", color: "#ffffff" }}
                  >
                    {processing ? processingAction : "Decrypt & Store Results"}
                  </button>
                )}

                {sessionInfo.decryptionRequested && chainId !== 31337 && (
                  <div className="p-4 rounded-lg" style={{ backgroundColor: "#fff3cd", color: "#856404" }}>
                    <p className="text-sm">
                      ⏳ Waiting for Sepolia Gateway to process decryption request. 
                      This usually takes ~5 minutes.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t" style={{ borderColor: designTokens.colors.gray[200] }}>
                <p className="text-xs" style={{ color: designTokens.colors.gray[500] }}>
                  💡 Individual votes remain encrypted. Only aggregated totals are decrypted.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-xl text-center" style={{ backgroundColor: designTokens.colors.primary[50] }}>
            <h2 className="text-2xl font-bold mb-4" style={{ color: designTokens.colors.gray[900] }}>
              Results Encrypted
            </h2>
            <p style={{ color: designTokens.colors.gray[600] }}>
              This session has {sessionInfo.voteCount} encrypted votes. Only authorized theater companies can decrypt the aggregated results.
            </p>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
