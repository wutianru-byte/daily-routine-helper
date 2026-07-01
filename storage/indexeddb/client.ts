// client.ts
//
// Concrete implementation of StorageClient backed by IndexedDB (via idb).
// This is the only storage implementation upper layers should import in M1.
// Swapping to a different storage engine later means implementing
// StorageClient again here (or in a sibling module) without touching
// core/* or app/*.

import { StorageClient, StoreName } from "../storage.interface";
import { getDB } from "./db";

export const indexedDBStorageClient: StorageClient = {
  async get<T>(store: StoreName, id: string): Promise<T | undefined> {
    const db = await getDB();
    return (await db.get(store, id)) as T | undefined;
  },

  async save<T extends { id: string }>(store: StoreName, value: T): Promise<void> {
    const db = await getDB();
    await db.put(store, value);
  },

  async list<T>(store: StoreName): Promise<T[]> {
    const db = await getDB();
    return (await db.getAll(store)) as T[];
  },

  async remove(store: StoreName, id: string): Promise<void> {
    const db = await getDB();
    await db.delete(store, id);
  },
};
