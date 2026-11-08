import { useEffect, useState } from 'react';
import { newId } from './id';

// Images are too large for localStorage, so they live in IndexedDB as blobs,
// keyed by id.
const DB_NAME = 'notes';
const STORE = 'images';
// Images are scaled down so that the longer side has at most MAX_SIDE pixels.
const MAX_SIDE = 1600;
const QUALITY = 0.85;

let db: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  db ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return db;
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const store = (await openDb()).transaction(STORE, mode).objectStore(STORE);
  return new Promise((resolve, reject) => {
    const request = fn(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const getImage = (id: string) => run<Blob | undefined>('readonly', (s) => s.get(id));
export const deleteImage = (id: string) => run('readwrite', (s) => s.delete(id));

// Scale an image file down to MAX_SIDE, store it as JPEG and return its id.
export async function addImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image conversion failed'))), 'image/jpeg', QUALITY),
  );
  const id = newId();
  await run('readwrite', (s) => s.put(blob, id));
  // Ask the browser to keep the data when storage gets low.
  navigator.storage?.persist?.().catch(() => {});
  return id;
}

// Object URLs of the loaded images, by id. An image keeps its URL for the
// lifetime of the page, so that lists do not load an image more than once.
const urls = new Map<string, Promise<string | null>>();

function imageUrl(id: string): Promise<string | null> {
  let url = urls.get(id);
  if (!url) {
    url = getImage(id).then((blob) => (blob ? URL.createObjectURL(blob) : null), () => null);
    urls.set(id, url);
  }
  return url;
}

// The object URL of an image, or null while it loads or when it is missing.
export function useImageUrl(id: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    imageUrl(id).then((u) => active && setUrl(u));
    return () => {
      active = false;
    };
  }, [id]);
  return url;
}
