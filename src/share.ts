import { getImage } from './images';
import type { Note } from './notes';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'insecure' | 'failed';

// Share the text and the images of a note with the share sheet of the system,
// for example to WhatsApp. A browser that cannot share files shares the text
// only. A browser without a share sheet copies the text to the clipboard.
// Both need a secure context (HTTPS or localhost).
export async function shareNote(note: Note): Promise<ShareResult> {
  if (!isSecureContext) return 'insecure';
  const text = note.text.trim();
  const blobs = await Promise.all(note.images.map(getImage));
  const files = blobs
    .filter((b): b is Blob => b !== undefined)
    .map((b, i) => new File([b], `image-${i + 1}.jpg`, { type: 'image/jpeg' }));

  const data: ShareData = files.length > 0 ? { text, files } : { text };
  try {
    if (navigator.share) {
      if (files.length === 0 || navigator.canShare?.(data)) await navigator.share(data);
      else await navigator.share({ text });
      return 'shared';
    }
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch (e) {
    return e instanceof DOMException && e.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
