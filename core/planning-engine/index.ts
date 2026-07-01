// core/planning-engine
//
// Core of the system (Decision 004). The Planning Engine is the only module
// that is allowed to call ai-adapter. It does not know whether the caller is
// a Route Handler, a script, or anything else, and it does not know which
// AI provider is behind AIProvider — only that it conforms to the interface.
//
// M1 scope: minimal orchestration. generatePlan() takes a PlanningContextSnapshot,
// builds a simple prompt from it, and delegates to the AI provider. It does
// NOT yet parse the result into a structured DailyPlan — that arrives in
// Milestone 3. This keeps the call chain (route -> planning-engine -> adapter)
// real and working end-to-end, while leaving the actual planning logic for
// later.

import { activeProvider } from "@/ai-adapter";
import { AIProvider } from "@/ai-adapter/provider.interface";
import { PlanningContextSnapshot } from "@/types/context";
import { logInfo, logError } from "@/core/shared/logger";

export interface GeneratePlanResult {
  rawText: string;
}

// Provider is injected with a default so M1 can swap implementations later
// (e.g. in tests) without changing call sites. The default itself is
// resolved through ai-adapter/index.ts (the provider composition root),
// not by importing a concrete adapter here — see Decision 008.
//
// requestId is optional and diagnostic-only (Decision 015): it lets the
// route's logs and this layer's logs be correlated in the terminal. It is
// not part of the business logic and does not flow into AIProvider, which
// keeps the provider interface unchanged.
export async function generatePlan(
  context: PlanningContextSnapshot,
  provider: AIProvider = activeProvider,
  requestId?: string
): Promise<GeneratePlanResult> {
  const prompt = buildPrompt(context);

  logInfo(
    "planning-engine",
    `Calling AI provider with prompt (${prompt.length} chars, ${context.goals.length} goal(s))`,
    undefined,
    requestId
  );

  try {
    const result = await provider.callModel({ prompt });
    logInfo("planning-engine", "AI provider call succeeded", undefined, requestId);
    return { rawText: result.rawText };
  } catch (error) {
    logError("planning-engine", "AI provider call threw", error, requestId);
    throw error;
  }
}

// M1: a minimal prompt that just lists current goals. Real prompt design
// (rationale, workload balancing, measurable tasks) is Milestone 3 scope.
function buildPrompt(context: PlanningContextSnapshot): string {
  const goalLines = context.goals.length
    ? context.goals.map((g) => `- ${g.title} (${g.category})`).join("\n")
    : "(no goals defined yet)";

  return [
    "You are a daily planning assistant.",
    "Here are the user's current long-term goals:",
    goalLines,
    "",
    "Briefly acknowledge these goals in one or two sentences.",
    "(This is an M1 smoke test prompt; structured daily plan generation is not implemented yet.)",
  ].join("\n");
}
