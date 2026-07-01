// storage/index.ts
//
// Composition root for storage. This is the ONLY file that should import a
// concrete storage implementation (currently IndexedDB). Every other module
// (core/*, app/*) should import `storageClient` from here and use it through
// the StorageClient interface — never import storage/indexeddb/* directly.
//
// Swapping the storage engine later (e.g. file-based storage via the File
// System Access API) means changing this one line, not every manager.

import { StorageClient } from "./storage.interface";
import { indexedDBStorageClient } from "./indexeddb/client";

export const storageClient: StorageClient = indexedDBStorageClient;
