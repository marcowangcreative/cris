import { describe, expect, it } from "vitest";
import { canTransition } from "@/lib/billing/status";
import { isOverdue, oweTotals, owesRows } from "@/lib/billing/owes";
import type { Invoice, Stylist } from "@/lib/domain";

describe("invoice status transitions", () => {
  it("lets ACH move from sent to processing to paid, and recover after a failure", () => {
    expect(canTransition("sent", "processing")).toBe(true);
    expect(canTransition("processing", "paid")).toBe(true);
    expect(canTransition("sent", "failed")).toBe(true);
    expect(canTransition("failed", "paid")).toBe(true);
    expect(canTransition("failed", "processing")).toBe(true);
  });

  it("does not reopen a paid or void invoice", () => {
    expect(canTransition("paid", "failed")).toBe(false);
    expect(canTransition("paid", "processing")).toBe(false);
    expect(canTransition("void", "paid")).toBe(false);
  });
});

describe("who owes what", () => {
  const stylists = [{ id: "a", name: "Ava" } as Stylist, { id: "b", name: "Bea" } as Stylist];

  function invoice(partial: Partial<Invoice> & Pick<Invoice, "id" | "status">): Invoice {
    return {
      salonId: "s",
      stylistId: "a",
      weekStart: "2026-11-02",
      weekEnd: "2026-11-08",
      netServiceRevenue: 0,
      rentAmount: 100,
      serviceFeeRate: 0,
      serviceFeeAmount: 0,
      totalAmount: 100,
      billingModel: "flat_weekly",
      minimumApplied: false,
      capApplied: false,
      stripeInvoiceId: null,
      stripeInvoiceUrl: null,
      stripePaymentIntentId: null,
      errorMessage: null,
      dueOn: "2026-11-10",
      sentAt: null,
      createdAt: "2026-11-08T00:00:00.000Z",
      ...partial,
    };
  }

  it("flags sent invoices past their due date and sorts them first", () => {
    const rows = owesRows(
      [
        invoice({ id: "processing", status: "processing", stylistId: "b", totalAmount: 50, dueOn: "2026-11-01" }),
        invoice({ id: "open", status: "sent", dueOn: "2026-11-20", totalAmount: 80 }),
        invoice({ id: "late", status: "sent", dueOn: "2026-11-04", totalAmount: 70 }),
        invoice({ id: "done", status: "paid", totalAmount: 999 }),
      ],
      stylists,
      "2026-11-12",
    );
    expect(rows.map((row) => row.invoiceId)).toEqual(["late", "open", "processing"]);
    expect(rows[0]?.overdue).toBe(true);
    expect(rows[0]?.stylistName).toBe("Ava");
    expect(isOverdue({ status: "processing", dueOn: "2026-11-01" }, "2026-11-12")).toBe(false);
    expect(isOverdue({ status: "sent", dueOn: "2026-11-12" }, "2026-11-12")).toBe(false);
    const totals = oweTotals(rows);
    expect(totals.overdue).toBe(70);
    expect(totals.toCollect).toBe(150);
    expect(totals.processing).toBe(50);
  });
});
