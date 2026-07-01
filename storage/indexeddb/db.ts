// db.ts
//
// IndexedDB database setup using the `idb` wrapper.
// Defines the object stores needed for M1: goals, plans, reviews.
// This file is the only place that knows about IndexedDB schema details.

import { openDB, DBSchema, IDBPDatabase } from "idb";
import { StoreName } from "../storage.interface";

const DB_NAME = "daily-routine-helper";
const DB_VERSION = 1;

interface AppDBSchema extends DBSchema {
  goals: {
    key: string;
    value: unknown;
  };
  plans: {
    key: string;
    value: unknown;
  };
  reviews: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<AppDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<AppDBSchema>> {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser.");
  }

  if (!dbPromise) {
    dbPromise = openDB<AppDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const stores: StoreName[] = ["goals", "plans", "reviews"];
        for (const store of stores) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: "id" });
          }
        }
      },
    });
  }

  return dbPromise;
}
