"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useContract } from "@/hooks/useContract";
import { designTokens } from "@/lib/design-tokens";

export default function CreateSessionPage() {
  const router = useRouter();
  const { account, isConnected } = useWallet();
  const { contract } = useContract();

  const [formData, setFormData] = useState({
    title: "",
    venue: "",
    date: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !account) {
      setError("Please connect your wallet first");
      return;
    }

    if (!contract) {
      setError("Contract not available");
      return;
    }

    if (!formData.title.trim() || !formData.venue.trim() || !formData.date) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      console.log("📝 Creating session:", formData);

      // Calculate start time and end time
      let startTime = Math.floor(new Date(formData.date).getTime() / 1000);
      const now = Math.floor(Date.now() / 1000);
      
      // If selected time is in the past, use current time instead
      if (startTime < now) {
        console.log("⚠️ Selected time is in the past, using current time");
        startTime = now;
      }
      
      // Session duration: 24 hours (allow ample time for voting)
      const endTime = startTime + 86400; // 24 hours later

      const tx = await contract.createSession(
        formData.title,
        formData.venue,
        startTime,
        endTime
      );

      console.log("⏳ Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("✅ Session created:", receipt);

      // Parse the event to get session ID
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === "SessionCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = contract.interface.parseLog(event);
        const sessionId = parsed?.args[0];
        console.log("🎭 New session ID:", sessionId.toString());
        
        // Redirect to the new session
        router.push(`/results/${sessionId}`);
      } else {
        // Fallback: redirect to sessions list
        router.push("/sessions");
      }
    } catch (err: any) {
      console.error("❌ Failed to create session:", err);
      setError(err.message || "Failed to create session");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: designTokens.colors.gray[50] }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: designTokens.colors.gray[900] }}>
            Wallet Connection Required
          </h1>
          <p style={{ color: designTokens.colors.gray[600] }}>
            Please connect your wallet to create a performance session
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ backgroundColor: designTokens.colors.gray[50] }}>
      <div className="max-w-2xl mx-auto">
        <h1 
          className="text-4xl font-bold mb-2"
          style={{ color: designTokens.colors.primary[600] }}
        >
          Create Performance Session
        </h1>
        <p className="mb-8" style={{ color: designTokens.colors.gray[600] }}>
          Set up a new theater preview performance for audience voting
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label 
              htmlFor="title" 
              className="block text-sm font-medium mb-2"
              style={{ color: designTokens.colors.gray[900] }}
            >
              Performance Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., 'Hamlet - Act III Preview'"
              required
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2"
              style={{
                backgroundColor: "#ffffff",
                borderColor: designTokens.colors.gray[300],
                color: designTokens.colors.gray[900],
              }}
            />
          </div>

          {/* Venue */}
          <div>
            <label 
              htmlFor="venue" 
              className="block text-sm font-medium mb-2"
              style={{ color: designTokens.colors.gray[900] }}
            >
              Venue *
            </label>
            <input
              type="text"
              id="venue"
              name="venue"
              value={formData.venue}
              onChange={handleChange}
              placeholder="e.g., 'Black Box Theater'"
              required
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2"
              style={{
                backgroundColor: "#ffffff",
                borderColor: designTokens.colors.gray[300],
                color: designTokens.colors.gray[900],
              }}
            />
          </div>

          {/* Date */}
          <div>
            <label 
              htmlFor="date" 
              className="block text-sm font-medium mb-2"
              style={{ color: designTokens.colors.gray[900] }}
            >
              Performance Date & Time *
            </label>
            <input
              type="datetime-local"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2"
              style={{
                backgroundColor: "#ffffff",
                borderColor: designTokens.colors.gray[300],
                color: designTokens.colors.gray[900],
              }}
            />
            <p className="mt-2 text-sm" style={{ color: designTokens.colors.gray[600] }}>
              💡 <strong>Voting Duration:</strong> The session will remain active for <strong>24 hours</strong> from the start time. 
              If you select a time in the past, the session will start immediately.
            </p>
          </div>

          {/* Description */}
          <div>
            <label 
              htmlFor="description" 
              className="block text-sm font-medium mb-2"
              style={{ color: designTokens.colors.gray[900] }}
            >
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief description of the performance..."
              rows={4}
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2"
              style={{
                backgroundColor: "#ffffff",
                borderColor: designTokens.colors.gray[300],
                color: designTokens.colors.gray[900],
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div 
              className="p-4 rounded-lg"
              style={{ backgroundColor: "#fee", color: "#c00" }}
            >
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-4 px-6 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50"
              style={{
                backgroundColor: designTokens.colors.primary[600],
                color: "#ffffff",
              }}
            >
              {isSubmitting ? "Creating Session..." : "Create Session"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/sessions")}
              className="px-6 py-4 rounded-lg font-semibold transition-all duration-300"
              style={{
                backgroundColor: "#ffffff",
                borderWidth: "2px",
                borderColor: designTokens.colors.gray[300],
                color: designTokens.colors.gray[900],
              }}
            >
              Cancel
            </button>
          </div>
        </form>

        <div 
          className="mt-8 p-6 rounded-lg"
          style={{ backgroundColor: designTokens.colors.primary[50] }}
        >
          <h3 className="font-semibold mb-3" style={{ color: designTokens.colors.gray[900] }}>
            📋 Session Lifecycle
          </h3>
          <ul className="space-y-2 text-sm" style={{ color: designTokens.colors.gray[700] }}>
            <li>
              <strong>1. Active (24 hours):</strong> Session opens for voting immediately. Audience can submit encrypted ratings.
            </li>
            <li>
              <strong>2. End Session:</strong> You can manually end the session anytime from the Theater Dashboard.
            </li>
            <li>
              <strong>3. Request Decryption:</strong> Once closed with ≥10 votes, you can request decryption of aggregated results.
            </li>
            <li>
              <strong>4. View Results:</strong> After decryption, beautiful radar charts show average scores (individual votes remain private).
            </li>
          </ul>
          <div className="mt-4 p-3 rounded" style={{ backgroundColor: designTokens.colors.primary[100] }}>
            <p className="text-sm font-medium" style={{ color: designTokens.colors.gray[900] }}>
              💡 <strong>Pro Tip:</strong> Share the voting link with your audience right after creation. They can vote anytime during the 24-hour window!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

