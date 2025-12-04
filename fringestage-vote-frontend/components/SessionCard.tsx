"use client";

import Link from "next/link";

interface SessionCardProps {
  sessionId: number;
  title: string;
  venue: string;
  startTime: number;
  endTime: number;
  voteCount: number;
  isActive: boolean;
  theaterCompany: string;
  currentAccount?: string;
  onEndSession?: (sessionId: number) => void;
  isEndingSession?: boolean;
}

export function SessionCard({
  sessionId,
  title,
  venue,
  startTime,
  endTime,
  voteCount,
  isActive,
  theaterCompany,
  currentAccount,
  onEndSession,
  isEndingSession = false,
}: SessionCardProps) {
  const now = Date.now() / 1000;
  const hasStarted = now >= startTime;
  const hasEnded = now >= endTime || !isActive;
  const isOwner = currentAccount && theaterCompany.toLowerCase() === currentAccount.toLowerCase();

  const getStatus = () => {
    if (!hasStarted) return { label: "Not Started", color: "bg-blue-100 text-blue-800" };
    if (hasEnded) return { label: "Ended", color: "bg-gray-100 text-gray-800" };
    return { label: "Active", color: "bg-green-100 text-green-800" };
  };

  const status = getStatus();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎭</span>
          <span>{venue}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <span>{formatDate(startTime)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">⏰</span>
          <span>Ends: {formatDate(endTime)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">🗳️</span>
          <span>{voteCount} vote{voteCount !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-4">
        Theater: {theaterCompany.slice(0, 6)}...{theaterCompany.slice(-4)}
      </div>

      <div className="flex gap-2">
        {hasStarted && !hasEnded && (
          <>
            <Link
              href={`/vote/${sessionId}`}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-center text-sm font-medium"
            >
              Vote Now
            </Link>
            {isOwner && onEndSession && (
              <button
                onClick={() => onEndSession(sessionId)}
                disabled={isEndingSession}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400 text-sm font-medium whitespace-nowrap"
                title="End voting session early"
              >
                {isEndingSession ? "Ending..." : "🛑 End"}
              </button>
            )}
          </>
        )}
        {hasEnded && (
          <Link
            href={`/results/${sessionId}`}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-center text-sm font-medium"
          >
            View Results
          </Link>
        )}
        {!hasStarted && (
          <button
            disabled
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed text-center text-sm font-medium"
          >
            Not Started
          </button>
        )}
      </div>
    </div>
  );
}

