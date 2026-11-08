// A random id. `crypto.randomUUID` exists only in secure contexts (HTTPS and
// localhost), but `crypto.getRandomValues` exists in all contexts.
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
