// storage.interface.ts
//
// Generic persistence contract. Upper layers (core/*) depend only on this
// interface, never on IndexedDB directly. This keeps Decision 008's spirit
// (replaceable infrastructure) consistent for storage as well as for AI models:
// the underlying engine (IndexedDB today, possibly file-based storage later)
// can change without touching business logic.
//
// M1 scope: covers the stores actually needed this milestone (goals, plans,
// reviews). Methods are generic so adding a new store later does not require
// changing this interface.

export type StoreName = "goals" | "plans" | "reviews";

export interface StorageClient {
  get<T>(store: StoreName, id: string): Promise<T | undefined>;
  save<T extends { id: string }>(store: StoreName, value: T): Promise<void>;
  list<T>(store: StoreName): Promise<T[]>;
  remove(store: StoreName, id: string): Promise<void>;
}
