// PlanningContextSnapshot
// Structured input assembled for the Planning Engine before plan generation.
// M1 scope: minimal version containing only the goal list. Recent reviews,
// planning patterns, and workload trends are added in later milestones
// (M5 — Planning Context and Persistence).

import { LongTermGoal } from "./goal";

export interface PlanningContextSnapshot {
  goals: LongTermGoal[];
  // Reserved for future milestones (kept optional so M1 can omit them):
  recentReviews?: unknown[];
  planningPatterns?: unknown[];
}
