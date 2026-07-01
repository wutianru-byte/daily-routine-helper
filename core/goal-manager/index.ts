// core/goal-manager
//
// Maintains long-term goals. M1 scope: create + list only.
// Depends only on the StorageClient interface (via storage/index.ts), never
// on a concrete storage implementation, so the storage engine can be
// swapped later without changes here.

import { storageClient } from "@/storage";
import { generateId } from "@/core/shared/id";
import { LongTermGoal, NewGoalInput } from "@/types/goal";

export async function createGoal(input: NewGoalInput): Promise<LongTermGoal> {
  const now = new Date().toISOString();
  const goal: LongTermGoal = {
    id: generateId(),
    title: input.title,
    category: input.category,
    description: input.description,
    priority: input.priority,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  await storageClient.save<LongTermGoal>("goals", goal);
  return goal;
}

export async function listGoals(): Promise<LongTermGoal[]> {
  return storageClient.list<LongTermGoal>("goals");
}
