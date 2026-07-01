// DailyPlan / DailyPlanItem
// Represents the plan generated for a single day, produced by the Planning Engine.
// M1 scope: types only. Real generation logic arrives in M3.

export type PlanItemStatus = "pending" | "done" | "skipped";

export interface DailyPlanItem {
  id: string;
  title: string;
  category: string;
  completionCriteria: string;
  notes: string;
  status: PlanItemStatus;
}

export interface DailyPlan {
  id: string;
  date: string; // ISO date, e.g. "2026-06-30"
  linkedGoalIds: string[];
  rationale: string;
  items: DailyPlanItem[];
  expectedWorkload: string;
  createdAt: string; // ISO timestamp
}
