import fs from "node:fs";
import path from "node:path";
import { canTransition } from "@/lib/billing/status";
import { priorWeekRange } from "@/lib/dates";
import { buildDemoState, DEMO_SALON_ID, type DemoState } from "@/lib/demo/seed";
import type { Invoice, Salon, Stylist } from "@/lib/domain";
import type { StylistInput } from "@/lib/validation";
import type { AdminRepo, InvoicePatch, Repo } from "@/lib/data/types";

function storePath(): string {
  return path.join(process.cwd(), ".demo", "store.json");
}

export function loadDemoState(): DemoState {
  const anchor = priorWeekRange(new Date()).start;
  const file = storePath();
  if (fs.existsSync(file)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as DemoState;
      if (parsed?.version === 1 && parsed.anchorWeekStart === anchor) return parsed;
    } catch {
      // Fall through and reseed when the file is unreadable or from another week.
    }
  }
  const fresh = buildDemoState(new Date());
  saveDemoState(fresh);
  return fresh;
}

export function saveDemoState(state: DemoState): void {
  const file = storePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

function mutate(change: (state: DemoState) => void): DemoState {
  const state = loadDemoState();
  change(state);
  saveDemoState(state);
  return state;
}

export function createDemoRepo(): Repo & AdminRepo {
  return {
    async getSalonByOwner(ownerId) {
      const state = loadDemoState();
      return state.salon.ownerId === ownerId ? structuredClone(state.salon) : null;
    },
    async createSalon(input) {
      let created: Salon | null = null;
      mutate((state) => {
        if (state.salon.ownerId === input.ownerId) {
          throw conflict("This login already has a salon.");
        }
        state.salon = {
          id: DEMO_SALON_ID,
          ownerId: input.ownerId,
          name: input.name,
          stripeAccountId: null,
        };
        created = state.salon;
      });
      return structuredClone(created!);
    },
    async updateSalon(_salonId, ownerId, name) {
      let updated: Salon | null = null;
      mutate((state) => {
        if (state.salon.ownerId !== ownerId) throw new Error("Salon not found.");
        state.salon.name = name;
        updated = state.salon;
      });
      return structuredClone(updated!);
    },
    async listStylists(salonId) {
      return loadDemoState()
        .stylists.filter((stylist) => stylist.salonId === salonId)
        .map((stylist) => structuredClone(stylist));
    },
    async getStylist(salonId, stylistId) {
      const stylist = loadDemoState().stylists.find(
        (row) => row.salonId === salonId && row.id === stylistId,
      );
      return stylist ? structuredClone(stylist) : null;
    },
    async createStylist(salonId, input) {
      let created: Stylist | null = null;
      mutate((state) => {
        assertSalon(state, salonId);
        if (state.stylists.some((stylist) => stylist.email === input.email)) {
          throw conflict("A stylist with that email is already on this salon.");
        }
        created = stylistFromInput(salonId, crypto.randomUUID(), input, null);
        state.stylists.push(created);
      });
      return structuredClone(created!);
    },
    async updateStylist(salonId, stylistId, input) {
      let updated: Stylist | null = null;
      mutate((state) => {
        const stylist = requireStylist(state, salonId, stylistId);
        if (state.stylists.some((row) => row.email === input.email && row.id !== stylistId)) {
          throw conflict("A stylist with that email is already on this salon.");
        }
        Object.assign(stylist, input);
        updated = stylist;
      });
      return structuredClone(updated!);
    },
    async setStylistStripe(salonId, stylistId, patch) {
      mutate((state) => {
        const stylist = requireStylist(state, salonId, stylistId);
        if (patch.stripeCustomerId !== undefined) stylist.stripeCustomerId = patch.stripeCustomerId;
        if (patch.paymentMethodId !== undefined) stylist.paymentMethodId = patch.paymentMethodId;
        if (patch.paymentMethodStatus) {
          if (!(stylist.paymentMethodStatus === "verified" && patch.paymentMethodStatus === "pending")) {
            stylist.paymentMethodStatus = patch.paymentMethodStatus;
          }
        }
      });
    },
    async listInvoices(salonId) {
      return loadDemoState()
        .invoices.filter((invoice) => invoice.salonId === salonId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((invoice) => structuredClone(invoice));
    },
    async getInvoice(salonId, invoiceId) {
      const invoice = loadDemoState().invoices.find(
        (row) => row.salonId === salonId && row.id === invoiceId,
      );
      return invoice ? structuredClone(invoice) : null;
    },
    async insertInvoice(input) {
      let created: Invoice | null = null;
      mutate((state) => {
        assertSalon(state, input.salonId);
        if (!state.stylists.some((stylist) => stylist.id === input.stylistId && stylist.salonId === input.salonId)) {
          throw new Error("Stylist not found in this salon.");
        }
        if (
          state.invoices.some(
            (invoice) =>
              invoice.stylistId === input.stylistId &&
              invoice.weekStart === input.weekStart &&
              (invoice.status === "draft" ||
                invoice.status === "sent" ||
                invoice.status === "processing" ||
                invoice.status === "paid"),
          )
        ) {
          throw conflict("Already billed for this week.");
        }
        created = {
          ...input,
          id: crypto.randomUUID(),
          status: "draft",
          createdAt: new Date().toISOString(),
        };
        state.invoices.push(created);
      });
      return structuredClone(created!);
    },
    async updateInvoice(salonId, invoiceId, patch) {
      let updated: Invoice | null = null;
      mutate((state) => {
        const invoice = state.invoices.find((row) => row.salonId === salonId && row.id === invoiceId);
        if (!invoice) throw new Error("Invoice not found.");
        applyPatch(invoice, patch);
        updated = invoice;
      });
      return structuredClone(updated!);
    },
    async applyInvoiceStatus(input) {
      let applied = false;
      mutate((state) => {
        const invoice = state.invoices.find((row) => {
          if (input.boothInvoiceId && row.id === input.boothInvoiceId) return true;
          if (input.stripeInvoiceId && row.stripeInvoiceId === input.stripeInvoiceId) return true;
          if (input.paymentIntentId && row.stripePaymentIntentId === input.paymentIntentId) return true;
          return false;
        });
        if (!invoice) return;
        if (invoice.status === input.status) {
          applied = true;
          return;
        }
        if (!canTransition(invoice.status, input.status)) return;
        invoice.status = input.status;
        if (input.errorMessage !== undefined) invoice.errorMessage = input.errorMessage;
        if (input.status === "paid") invoice.errorMessage = null;
        applied = true;
      });
      return applied;
    },
    async setBankByCustomer(input) {
      mutate((state) => {
        const stylist = state.stylists.find((row) => row.stripeCustomerId === input.stripeCustomerId);
        if (!stylist) return;
        if (stylist.paymentMethodStatus === "verified" && input.status === "pending") return;
        if (input.paymentMethodId) stylist.paymentMethodId = input.paymentMethodId;
        stylist.paymentMethodStatus = input.status;
      });
    },
  };
}

function applyPatch(invoice: Invoice, patch: InvoicePatch): void {
  if (patch.status && patch.status !== invoice.status) {
    if (!canTransition(invoice.status, patch.status)) {
      throw new Error(`Cannot change an invoice from ${invoice.status} to ${patch.status}.`);
    }
    invoice.status = patch.status;
  }
  if (patch.stripeInvoiceId !== undefined) invoice.stripeInvoiceId = patch.stripeInvoiceId;
  if (patch.stripeInvoiceUrl !== undefined) invoice.stripeInvoiceUrl = patch.stripeInvoiceUrl;
  if (patch.stripePaymentIntentId !== undefined) {
    invoice.stripePaymentIntentId = patch.stripePaymentIntentId;
  }
  if (patch.errorMessage !== undefined) invoice.errorMessage = patch.errorMessage;
  if (patch.dueOn !== undefined) invoice.dueOn = patch.dueOn;
  if (patch.sentAt !== undefined) invoice.sentAt = patch.sentAt;
}

function stylistFromInput(
  salonId: string,
  id: string,
  input: StylistInput,
  existing: Stylist | null,
): Stylist {
  return {
    id,
    salonId,
    name: input.name,
    email: input.email,
    active: input.active,
    billingModel: input.billingModel,
    weeklyRent: input.weeklyRent,
    monthlyRent: input.monthlyRent,
    feeRate: input.feeRate,
    serviceFeeMonthlyCap: input.serviceFeeMonthlyCap,
    minimumRemit: input.minimumRemit,
    stripeCustomerId: existing?.stripeCustomerId ?? `cus_demo_${id.slice(0, 8)}`,
    paymentMethodId: existing?.paymentMethodId ?? null,
    paymentMethodStatus: existing?.paymentMethodStatus ?? "none",
  };
}

function assertSalon(state: DemoState, salonId: string): void {
  if (state.salon.id !== salonId) throw new Error("Salon not found.");
}

function requireStylist(state: DemoState, salonId: string, stylistId: string): Stylist {
  const stylist = state.stylists.find((row) => row.salonId === salonId && row.id === stylistId);
  if (!stylist) throw new Error("Stylist not found.");
  return stylist;
}

function conflict(message: string): Error {
  const error = new Error(message);
  error.name = "Conflict";
  return error;
}
