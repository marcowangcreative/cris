export type CsvRevenueRow = {
  email: string | null;
  name: string | null;
  net: number;
  label: string;
};

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"') {
      quoted = true;
      continue;
    }
    if (character === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cell += character;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }
  return rows;
}

const NET_HEADERS = new Set([
  "net",
  "net_revenue",
  "net_service_revenue",
  "revenue",
  "amount",
]);

export function parseRevenueCsv(text: string): { rows: CsvRevenueRow[]; error: string | null } {
  const table = parseCsv(text.trim());
  if (table.length === 0) return { rows: [], error: "The CSV is empty." };
  const header = table[0].map((value) => value.trim().toLowerCase());
  const emailIndex = header.findIndex((value) => value === "email" || value === "stylist_email");
  const nameIndex = header.findIndex((value) => value === "name" || value === "stylist");
  const netIndex = header.findIndex((value) => NET_HEADERS.has(value));
  if (netIndex === -1) {
    return { rows: [], error: "Add a net_revenue column. Email or name is used to match stylists." };
  }

  const rows: CsvRevenueRow[] = [];
  for (const cells of table.slice(1)) {
    if (cells.every((value) => value.trim() === "")) continue;
    const email = emailIndex >= 0 ? cells[emailIndex]?.trim() || null : null;
    const name = nameIndex >= 0 ? cells[nameIndex]?.trim() || null : null;
    const raw = (cells[netIndex] ?? "").replace(/[$,\s]/g, "");
    const net = Number(raw);
    const label = email || name || "a row";
    if (!Number.isFinite(net)) {
      return { rows: [], error: `“${label}” does not have a numeric net revenue.` };
    }
    rows.push({ email, name, net, label });
  }
  return { rows, error: null };
}

export function matchRevenueCsv(
  text: string,
  stylists: { id: string; email: string; name: string }[],
): { revenue: Record<string, number>; unmatched: string[]; error: string | null } {
  const parsed = parseRevenueCsv(text);
  if (parsed.error) return { revenue: {}, unmatched: [], error: parsed.error };
  const byEmail = new Map(stylists.map((stylist) => [stylist.email.trim().toLowerCase(), stylist]));
  const byName = new Map<string, { id: string; email: string; name: string }[]>();
  for (const stylist of stylists) {
    const key = stylist.name.trim().toLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), stylist]);
  }

  const revenue: Record<string, number> = {};
  const unmatched: string[] = [];
  for (const row of parsed.rows) {
    const emailMatch = row.email ? byEmail.get(row.email.toLowerCase()) : undefined;
    const nameMatches = row.name ? (byName.get(row.name.toLowerCase()) ?? []) : [];
    const match = emailMatch ?? (nameMatches.length === 1 ? nameMatches[0] : undefined);
    if (!match) {
      unmatched.push(row.label);
      continue;
    }
    revenue[match.id] = row.net;
  }
  return { revenue, unmatched, error: null };
}
