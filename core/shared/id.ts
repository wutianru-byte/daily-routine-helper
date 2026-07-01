// core/shared/id.ts
//
// Shared id generation used by every manager (goal-manager today; plan
// generation and review-manager will need it from M3/M4 onward). Keeping it
// in one place avoids each manager redefining the same one-liner.

export function generateId(): string {
  return crypto.randomUUID();
}
