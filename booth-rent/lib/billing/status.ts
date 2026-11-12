import type { InvoiceStatus } from "@/lib/domain";

/**
 * Status moves forward, with two exceptions: a failed ACH can still clear
 * later (failed → processing/paid), and an open invoice can be voided.
 * Paid and void do not move again.
 */
export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  if (from === to) return false;
  if (from === "paid" || from === "void") return false;
  if (to === "void") return true;
  if (to === "failed") return from === "draft" || from === "sent" || from === "processing";
  if (to === "sent") return from === "draft";
  if (to === "processing") return from === "draft" || from === "sent" || from === "failed";
  if (to === "paid") {
    return from === "draft" || from === "sent" || from === "processing" || from === "failed";
  }
  return false;
}

export function statusesThatCanBecome(next: InvoiceStatus): InvoiceStatus[] {
  const all: InvoiceStatus[] = ["draft", "sent", "processing", "paid", "failed", "void"];
  return all.filter((status) => canTransition(status, next));
}
