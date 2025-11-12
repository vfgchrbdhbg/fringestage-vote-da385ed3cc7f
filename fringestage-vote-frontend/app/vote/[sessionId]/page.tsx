"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { useFhevm } from "@/fhevm/useFhevm";
import { useContract } from "@/hooks/useContract";
import { RatingSlider } from "@/components/RatingSlider";
import { ethers } from "ethers";

interface SessionInfo {
  title: string;
  venue: string;
  startTime: number;
  endTime: number;
  theaterCompany: string;
  voteCount: number;
  isActive: boolean;
}

export default function VotePage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const sessionId = parseInt(params.sessionId);
  
  const { account, isConnected, connectWallet } = useWallet();
  const { fhevmInstance, isInitialized } = useFhevm();
  const { contract, contractAddress } = useContract();

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Rating states
  const [plotTension, setPlotTension] = useState(50);
  const [performance, setPerformance] = useState(50);
  const [stageDesign, setStageDesign] = useState(50);
  const [pacing, setPacing] = useState(50);
  const [comment, setComment] = useState("");

  // Fetch session info and check if user has voted
  useEffect(() => {
    const fetchData = async () => {
      if (!contract || !account) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get session info
        const info = await contract.getSessionInfo(sessionId);
        setSessionInfo({
          title: info.title,
          venue: info.venue,
          startTime: Number(info.startTime),
          endTime: Number(info.endTime),
          theaterCompany: info.theaterCompany,
          voteCount: Number(info.voteCount),
          isActive: info.isActive,
        });

        // Check if user has already voted
        const voted = await contract.hasVoted(sessionId, account);
        setHasVoted(voted);
      } catch (err: any) {
        console.error("Failed to fetch session data:", err);
        setError(err.message || "Failed to load session");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contract, sessionId, account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contract || !fhevmInstance || !account || !contractAddress) {
      setError("Contract or FHEVM instance not ready");
      return;
    }

    if (!sessionInfo || !sessionInfo.isActive) {
      setError("Session is not active");
      return;
    }

    const now = Date.now() / 1000;
    if (now < sessionInfo.startTime || now > sessionInfo.endTime) {
      setError("Session is not currently accepting votes");
      return;
    }

    if (hasVoted) {
      setError("You have already voted in this session");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      console.log("Creating encrypted inputs...");

      // Create encrypted input for plot tension
      const inputPlot = fhevmInstance.createEncryptedInput(contractAddress, account);
      inputPlot.add16(plotTension);
      const encryptedPlot = await inputPlot.encrypt();

      // Create encrypted input for performance
      const inputPerf = fhevmInstance.createEncryptedInput(contractAddress, account);
      inputPerf.add16(performance);
      const encryptedPerf = await inputPerf.encrypt();

      // Create encrypted input for stage design
      const inputStage = fhevmInstance.createEncryptedInput(contractAddress, account);
      inputStage.add16(stageDesign);
      const encryptedStage = await inputStage.encrypt();

      // Create encrypted input for pacing
      const inputPace = fhevmInstance.createEncryptedInput(contractAddress, account);
      inputPace.add16(pacing);
      const encryptedPace = await inputPace.encrypt();

      // Create comment hash
      const commentHash = comment.trim() 
        ? ethers.keccak256(ethers.toUtf8Bytes(comment.trim()))
        : ethers.ZeroHash;

      console.log("Submitting vote to contract...");

      // Submit vote to contract
      const tx = await contract.submitVote(
        sessionId,
        encryptedPlot.handles[0],
        encryptedPlot.inputProof,
        encryptedPerf.handles[0],
        encryptedPerf.inputProof,
        encryptedStage.handles[0],
        encryptedStage.inputProof,
        encryptedPace.handles[0],
        encryptedPace.inputProof,
        commentHash
      );

      console.log("Transaction submitted:", tx.hash);
      setTxHash(tx.hash);

      console.log("Waiting for confirmation...");
      await tx.wait();

      console.log("✓ Vote submitted successfully!");
      
      // Redirect to sessions page after 2 seconds
      setTimeout(() => {
        router.push("/sessions");
      }, 2000);
    } catch (err: any) {
      console.error("Failed to submit vote:", err);
      setError(err.message || "Failed to submit vote");
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!sessionInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Session Not Found</h1>
          <Link href="/sessions" className="text-primary-600 hover:underline">
            ← Back to Sessions
          </Link>
        </div>
      </div>
    );
  }

  if (txHash) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-amber-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-4 text-green-600">Vote Submitted!</h1>
          <p className="text-gray-600 mb-4">
            Your vote has been successfully submitted and encrypted on-chain.
          </p>
          <div className="bg-gray-100 rounded-lg p-3 mb-4 text-sm break-all">
            <div className="font-medium mb-1">Transaction Hash:</div>
            <div className="text-gray-600">{txHash}</div>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Redirecting to sessions...
          </p>
          <Link
            href="/sessions"
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-block"
          >
            Back to Sessions
          </Link>
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
              ← Back
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

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Session Info */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h1 className="text-3xl font-bold mb-2">{sessionInfo.title}</h1>
          <div className="text-gray-600 space-y-1">
            <div>📍 {sessionInfo.venue}</div>
            <div>
              📅 {new Date(sessionInfo.startTime * 1000).toLocaleString()} -{" "}
              {new Date(sessionInfo.endTime * 1000).toLocaleString()}
            </div>
            <div>🗳️ {sessionInfo.voteCount} votes submitted</div>
          </div>
        </div>

        {/* Alerts */}
        {!isInitialized && (
          <div className="bg-amber-100 border border-amber-400 rounded-lg p-4 mb-6">
            <p className="text-amber-800">⚠️ FHEVM is initializing... Please wait before submitting.</p>
          </div>
        )}

        {hasVoted && (
          <div className="bg-blue-100 border border-blue-400 rounded-lg p-4 mb-6">
            <p className="text-blue-800">ℹ️ You have already voted in this session.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 rounded-lg p-4 mb-6">
            <p className="text-red-800">❌ {error}</p>
          </div>
        )}

        {/* Vote Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-2xl font-bold mb-6">Submit Your Vote</h2>

          <div className="space-y-8">
            {/* Plot Tension */}
            <RatingSlider
              label="Plot Tension"
              description="How engaging was the storyline?"
              value={plotTension}
              onChange={setPlotTension}
            />

            {/* Performance */}
            <RatingSlider
              label="Acting Quality"
              description="How convincing were the actors?"
              value={performance}
              onChange={setPerformance}
            />

            {/* Stage Design */}
            <RatingSlider
              label="Stage & Visuals"
              description="How impressive was the visual design?"
              value={stageDesign}
              onChange={setStageDesign}
            />

            {/* Pacing */}
            <RatingSlider
              label="Pacing"
              description="How well-paced was the performance?"
              value={pacing}
              onChange={setPacing}
            />

            {/* Comment */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">
                Short Comment (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={200}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Share your thoughts briefly..."
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Your comment will be hashed for privacy</span>
                <span>{comment.length}/200</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm">
              <p className="text-purple-900">
                <strong>🔒 Privacy Note:</strong> Your ratings will be encrypted using FHEVM before being
                submitted to the blockchain. Individual votes cannot be revealed—only aggregated statistics.
              </p>
            </div>

            <button
              type="submit"
              disabled={!isInitialized || hasVoted || submitting || !sessionInfo.isActive}
              className="w-full px-6 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-lg transition-colors"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Encrypting & Submitting...
                </span>
              ) : hasVoted ? (
                "Already Voted"
              ) : !isInitialized ? (
                "FHEVM Initializing..."
              ) : (
                "Submit Encrypted Vote"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

