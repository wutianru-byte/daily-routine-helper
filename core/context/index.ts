// core/context
//
// Assembles the PlanningContextSnapshot passed to the Planning Engine.
// M1 scope: goals only. Recent reviews and planning patterns are added in
// Milestone 5 (Planning Context and Persistence).

import { listGoals } from "@/core/goal-manager";
import { PlanningContextSnapshot } from "@/types/context";

export async function assembleContext(): Promise<PlanningContextSnapshot> {
  const goals = await listGoals();
  return { goals };
}
