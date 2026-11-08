import { newId } from './id';

export interface Note {
  id: string;
  text: string;
  // Ids of the images in the image store, in the order of display.
  images: string[];
  archived: boolean;
  // Times in milliseconds since the epoch.
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'notes.v1';

export function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Note[]) : [];
  } catch {
    return [];
  }
}

export function saveNotes(notes: Note[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Storage is full or blocked; the notes stay in memory only.
  }
}

export function createNote(now: number): Note {
  return { id: newId(), text: '', images: [], archived: false, createdAt: now, updatedAt: now };
}

export function isEmpty(note: Note): boolean {
  return note.text.trim() === '' && note.images.length === 0;
}

// Replace the note with the same id, or add the note at the end.
export function putNote(notes: Note[], note: Note): Note[] {
  return notes.some((n) => n.id === note.id)
    ? notes.map((n) => (n.id === note.id ? note : n))
    : [...notes, note];
}

// The notes of one view, the most recently changed first.
export function visibleNotes(notes: Note[], archived: boolean): Note[] {
  return notes.filter((n) => n.archived === archived).sort((a, b) => b.updatedAt - a.updatedAt);
}
