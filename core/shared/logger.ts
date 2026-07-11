// core/shared/logger.ts
//
// Minimal server-side logging helper used only for debugging the
// route -> planning-engine -> ai-adapter call chain (see Decision 015).
// Not a general-purpose logging system — just a consistent, greppable
// console.log/error format so each layer's output is easy to tell apart
// in the terminal.

// Includes tags for every concrete AI provider adapter that exists in the
// codebase (active or legacy), not just the currently active one — adapters
// that are kept around as legacy (e.g. openai-adapter.ts, claude-adapter.ts
// per Decision 014) still need to type-check even when unreferenced by the
// composition root.
type Layer = "route" | "planning-engine" | "openai-adapter" | "deepseek-adapter";

function prefix(layer: Layer, requestId?: string): string {
  return requestId ? `[${layer}][${requestId}]` : `[${layer}]`;
}

export function logInfo(layer: Layer, message: string, data?: unknown, requestId?: string): void {
  if (data !== undefined) {
    console.log(prefix(layer, requestId), message, data);
  } else {
    console.log(prefix(layer, requestId), message);
  }
}

export function logError(layer: Layer, message: string, error: unknown, requestId?: string): void {
  console.error(prefix(layer, requestId), message, error);
}
