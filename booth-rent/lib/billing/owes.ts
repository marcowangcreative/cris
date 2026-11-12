import { roundMoney } from "@/lib/money";
import type { Invoice, InvoiceStatus, Stylist } from "@/lib/domain";

export type OweRow = {
  invoiceId: string;
  stylistId: string;
  stylistName: string;
  weekStart: string;
  weekEnd: string;
  totalAmount: number;
  status: InvoiceStatus;
  dueOn: string | null;
  overdue: boolean;
};

const OPEN_STATUSES: InvoiceStatus[] = ["sent", "processing", "failed"];

export function isOverdue(invoice: { status: InvoiceStatus; dueOn: string | null }, today: string): boolean {
  return invoice.status === "sent" && invoice.dueOn != null && invoice.dueOn < today;
}

export function owesRows(invoices: Invoice[], stylists: Stylist[], today: string): OweRow[] {
  const names = new Map(stylists.map((stylist) => [stylist.id, stylist.name]));
  return invoices
    .filter((invoice) => OPEN_STATUSES.includes(invoice.status))
    .map((invoice) => ({
      invoiceId: invoice.id,
      stylistId: invoice.stylistId,
      stylistName: names.get(invoice.stylistId) ?? "Former stylist",
      weekStart: invoice.weekStart,
      weekEnd: invoice.weekEnd,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
      dueOn: invoice.dueOn,
      overdue: isOverdue(invoice, today),
    }))
    .sort((a, b) => {
      const rank = (row: OweRow) =>
        row.overdue ? 0 : row.status === "failed" ? 1 : row.status === "sent" ? 2 : 3;
      const byRank = rank(a) - rank(b);
      if (byRank !== 0) return byRank;
      return (a.dueOn ?? "9999-99-99").localeCompare(b.dueOn ?? "9999-99-99");
    });
}

export function oweTotals(rows: OweRow[]): {
  toCollect: number;
  overdue: number;
  failed: number;
  processing: number;
} {
  const sum = (predicate: (row: OweRow) => boolean) =>
    roundMoney(rows.filter(predicate).reduce((total, row) => total + row.totalAmount, 0));
  return {
    toCollect: sum((row) => row.status === "sent" || row.status === "failed"),
    overdue: sum((row) => row.overdue),
    failed: sum((row) => row.status === "failed"),
    processing: sum((row) => row.status === "processing"),
  };
}
