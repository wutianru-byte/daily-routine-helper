// app/api/planning/route.ts
//
// Sole server-side entry point for triggering the Planning Engine.
// Responsibility: receive request, do minimal validation, call
// core/planning-engine, return its result. No business logic and no
// direct AI provider calls live here.
//
// Note on context: IndexedDB only exists in the browser, so the
// PlanningContextSnapshot is assembled client-side (core/context, called
// from the page) and sent in the request body. This route does not read
// storage directly.
//
// Debugging note (Decision 015): this route attaches a requestId to every
// call and logs at entry/exit so failures can be traced across the
// route -> planning-engine -> ai-adapter chain in the terminal. This is a
// diagnostic addition only; it does not change request/response shape
// beyond adding requestId/message fields to error responses.

import { NextRequest, NextResponse } from "next/server";
import { generatePlan } from "@/core/planning-engine";
import { PlanningContextSnapshot } from "@/types/context";
import { logInfo, logError } from "@/core/shared/logger";

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    logError("route", "Failed to parse request body as JSON", error, requestId);
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON.", requestId },
      { status: 400 }
    );
  }

  const context = (body as { context?: PlanningContextSnapshot })?.context;

  if (!context || !Array.isArray(context.goals)) {
    logError(
      "route",
      "Request body failed shape validation (expected { context: { goals: [] } })",
      body,
      requestId
    );
    return NextResponse.json(
      {
        error: "invalid_context",
        message: "Request body must include a context object with a goals array.",
        requestId,
      },
      { status: 400 }
    );
  }

  logInfo("route", `Received planning request with ${context.goals.length} goal(s)`, undefined, requestId);

  try {
    const result = await generatePlan(context, undefined, requestId);
    logInfo("route", "generatePlan succeeded", undefined, requestId);
    return NextResponse.json(result);
  } catch (error) {
    // Full error object goes to the terminal so the real cause (missing key,
    // bad model name, OpenAI error body, parsing failure, etc.) is visible.
    logError("route", "generatePlan threw", error, requestId);

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "planning_generation_failed", message, requestId },
      { status: 500 }
    );
  }
}
