"use client";

import { useEffect, useState } from "react";
import { createGoal, listGoals } from "@/core/goal-manager";
import { LongTermGoal } from "@/types/goal";

export default function GoalsPage() {
  const [goals, setGoals] = useState<LongTermGoal[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listGoals()
      .then(setGoals)
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const goal = await createGoal({
        title: title.trim(),
        category: category.trim() || "general",
        description: description.trim(),
        priority: 1,
      });
      setGoals((prev) => [...prev, goal]);
      setTitle("");
      setCategory("");
      setDescription("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Goals</h1>
        <p className="text-sm text-neutral-500">
          Define the long-term goals that future daily plans will be built from.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Build a sustainable exercise habit"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Category</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. health"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save goal"}
        </button>
      </form>

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-700">Saved goals</h2>
        {loading ? (
          <p className="text-sm text-neutral-400">Loading...</p>
        ) : goals.length === 0 ? (
          <p className="text-sm text-neutral-400">No goals yet.</p>
        ) : (
          <ul className="space-y-2">
            {goals.map((goal) => (
              <li key={goal.id} className="rounded-md border border-neutral-200 bg-white p-3">
                <p className="text-sm font-medium text-neutral-900">{goal.title}</p>
                <p className="text-xs text-neutral-500">{goal.category}</p>
                {goal.description && (
                  <p className="mt-1 text-sm text-neutral-600">{goal.description}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
