"use client";

import { useState } from "react";
import { assembleContext } from "@/core/context";

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTryPlanning() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const context = await assembleContext();

      const response = await fetch("/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Request failed.");
      }

      setResult(data.rawText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500">
          M1 milestone: this button verifies the full chain — front end → API
          route → planning engine → AI provider adapter → AI provider API.
        </p>
      </div>

      <button
        onClick={handleTryPlanning}
        disabled={loading}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Calling AI provider..." : "Test planning call"}
      </button>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-md border border-neutral-200 bg-white p-4">
          <p className="mb-1 text-xs font-medium uppercase text-neutral-400">
            Raw response
          </p>
          <p className="whitespace-pre-wrap text-sm text-neutral-800">{result}</p>
        </div>
      )}
    </div>
  );
}
