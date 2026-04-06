// IndexedDB wrapper for offline mutation and photo queues
// Uses raw IndexedDB API — no external dependencies

const DB_NAME = 'keyhub-offline';
const DB_VERSION = 1;
const MUTATION_STORE = 'mutationQueue';
const PHOTO_STORE = 'photoQueue';

export interface OfflineMutation {
  id?: number;
  type: 'job_status_update' | 'job_note_add';
  collection: string;
  docId: string;
  data: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
}

export interface OfflinePhoto {
  id?: number;
  jobId: string;
  dataUrl: string; // base64 data URL
  fileName: string;
  caption?: string;
  timestamp: number;
  synced: boolean;
}

function isClient(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isClient()) {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(MUTATION_STORE)) {
        db.createObjectStore(MUTATION_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }

      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function queueMutation(mutation: OfflineMutation): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MUTATION_STORE, 'readwrite');
    const store = tx.objectStore(MUTATION_STORE);
    const request = store.add({ ...mutation, synced: false });

    request.onsuccess = () => {
      resolve(request.result as number);
    };

    request.onerror = () => {
      reject(request.error);
    };

    tx.oncomplete = () => {
      db.close();
    };
  });
}

export async function getMutationQueue(): Promise<OfflineMutation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MUTATION_STORE, 'readonly');
    const store = tx.objectStore(MUTATION_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as OfflineMutation[]);
    };

    request.onerror = () => {
      reject(request.error);
    };

    tx.oncomplete = () => {
      db.close();
    };
  });
}

export async function removeMutation(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MUTATION_STORE, 'readwrite');
    const store = tx.objectStore(MUTATION_STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };

    tx.oncomplete = () => {
      db.close();
    };
  });
}

export async function queuePhoto(photo: OfflinePhoto): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    const store = tx.objectStore(PHOTO_STORE);
    const request = store.add({ ...photo, synced: false });

    request.onsuccess = () => {
      resolve(request.result as number);
    };

    request.onerror = () => {
      reject(request.error);
    };

    tx.oncomplete = () => {
      db.close();
    };
  });
}

export async function getPhotoQueue(): Promise<OfflinePhoto[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readonly');
    const store = tx.objectStore(PHOTO_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as OfflinePhoto[]);
    };

    request.onerror = () => {
      reject(request.error);
    };

    tx.oncomplete = () => {
      db.close();
    };
  });
}

export async function removePhoto(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    const store = tx.objectStore(PHOTO_STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };

    tx.oncomplete = () => {
      db.close();
    };
  });
}

export async function clearAll(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([MUTATION_STORE, PHOTO_STORE], 'readwrite');

    tx.objectStore(MUTATION_STORE).clear();
    tx.objectStore(PHOTO_STORE).clear();

    tx.oncomplete = () => {
      db.close();
      resolve();
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
