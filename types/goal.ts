// LongTermGoal
// Represents a meaningful long-term objective the user wants to pursue.
// M1 scope: minimal fields only. Categories/priorities will be expanded in M2.

export type GoalStatus = "active" | "paused" | "completed";

export interface LongTermGoal {
  id: string;
  title: string;
  category: string;
  description: string;
  priority: number;
  status: GoalStatus;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// Shape used when creating a goal, before id/timestamps are assigned.
export type NewGoalInput = Pick<LongTermGoal, "title" | "category" | "description" | "priority">;
