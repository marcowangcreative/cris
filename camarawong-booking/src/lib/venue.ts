import type { Intake, TableSource } from "@/lib/types";

export const venueChecks = [
  {
    field: "venueSpace",
    label: "About 12×12 ft of space",
  },
  {
    field: "venuePower",
    label: "Power access",
  },
  {
    field: "venueWifi",
    label: "Reliable Wi-Fi, to text or email photos to guests from the iPad",
  },
  {
    field: "venueTable",
    label: "A table for a laptop and an iPad",
  },
] as const;

export function tableSourceLabel(source: TableSource | undefined): string {
  if (source === "venue") return "The venue provides the table";
  if (source === "studio") return "Please bring your 4 ft table";
  return "—";
}

export function confirmedLabel(value: boolean | undefined): string {
  return value ? "Confirmed" : "Not confirmed";
}

/** Crew-facing lines. Ceiling, outlet, and setup window stay notes. */
export function venueNoteLines(intake: Intake): string[] {
  return [
    `Space, about 12×12 ft: ${confirmedLabel(intake.venueSpace)}`,
    `Power: ${confirmedLabel(intake.venuePower)}`,
    `Wi-Fi for the iPad: ${confirmedLabel(intake.venueWifi)}`,
    `Table for laptop and iPad: ${confirmedLabel(intake.venueTable)}`,
    `Table source: ${tableSourceLabel(intake.tableSource)}`,
    `Ceiling height: ${intake.ceilingHeight || "—"}`,
    `Outlet or circuit: ${intake.outletNotes || "—"}`,
    `Load-in / setup window: ${intake.setupWindow || "—"}`,
  ];
}
