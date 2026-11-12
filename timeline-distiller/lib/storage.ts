import type { DaySheet, View } from "./types";

const KEY = "timeline-distiller:v1";

export type PersistedState = {
  version: 1;
  sourceText: string;
  formalsRef: string;
  manualGroups: string;
  baseMinutes: number;
  travelBufferMinutes: number;
  view: View;
  sheet: DaySheet | null;
};

export function emptyPersisted(): PersistedState {
  return {
    version: 1,
    sourceText: "",
    formalsRef: "",
    manualGroups: "",
    baseMinutes: 2,
    travelBufferMinutes: 15,
    view: "all",
    sheet: null,
  };
}

export function loadPersisted(): PersistedState {
  if (typeof window === "undefined") return emptyPersisted();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyPersisted();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (parsed.version !== 1 || !parsed.sheet && parsed.sheet !== null) return emptyPersisted();
    return { ...emptyPersisted(), ...parsed, version: 1 };
  } catch {
    return emptyPersisted();
  }
}

export function savePersisted(state: PersistedState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...state, version: 1 }));
  } catch {
    // A full browser is a private scratch pad. If it refuses, the sheet still works this session.
  }
}

export function clearPersisted(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Ignore.
  }
}
