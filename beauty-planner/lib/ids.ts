export function newId(): string {
  return crypto.randomUUID();
}

/** 24 random bytes as hex (48 chars). Not derived from the event id. */
export function newToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
