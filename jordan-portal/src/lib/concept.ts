/** Concept B lives under this prefix. Concept A, Atelier, stays at the root. */
export const APOTHECARY_HOME = "/apothecary";
/** Concept C, Editorial. */
export const EDITORIAL_HOME = "/editorial";

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

export function isEditorialPath(pathname: string): boolean {
  return pathname === EDITORIAL_HOME || pathname.startsWith(`${EDITORIAL_HOME}/`);
}

export function editorialHome(value: FormDataEntryValue | null): typeof EDITORIAL_HOME | null {
  return String(value ?? "") === EDITORIAL_HOME ? EDITORIAL_HOME : null;
}

/** Concept D, Maison. */
export const MAISON_HOME = "/maison";

export function isMaisonPath(pathname: string): boolean {
  return pathname === MAISON_HOME || pathname.startsWith(`${MAISON_HOME}/`);
}

export function maisonHome(value: FormDataEntryValue | null): typeof MAISON_HOME | null {
  return String(value ?? "") === MAISON_HOME ? MAISON_HOME : null;
}

export function maisonPath(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "");
  if (!isMaisonPath(raw)) return null;
  if (raw.includes("..") || raw.includes("\\") || raw.includes("://") || raw.includes("//")) {
    return null;
  }
  return raw;
}

export function editorialPath(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "");
  if (!isEditorialPath(raw)) return null;
  if (raw.includes("..") || raw.includes("\\") || raw.includes("://") || raw.includes("//")) {
    return null;
  }
  return raw;
}
