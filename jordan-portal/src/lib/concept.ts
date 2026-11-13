/** Concept B lives under this prefix. Concept A, Atelier, stays at the root. */
export const APOTHECARY_HOME = "/apothecary";

export function isApothecaryPath(pathname: string): boolean {
  return pathname === APOTHECARY_HOME || pathname.startsWith(`${APOTHECARY_HOME}/`);
}

/** Sign-in may only return to the apothecary home, then the role path is appended. */
export function apothecaryHome(value: FormDataEntryValue | null): typeof APOTHECARY_HOME | null {
  return String(value ?? "") === APOTHECARY_HOME ? APOTHECARY_HOME : null;
}

/** A return path must stay inside concept B. */
export function apothecaryPath(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "");
  if (!isApothecaryPath(raw)) return null;
  if (raw.includes("..") || raw.includes("\\") || raw.includes("://") || raw.includes("//")) {
    return null;
  }
  return raw;
}
