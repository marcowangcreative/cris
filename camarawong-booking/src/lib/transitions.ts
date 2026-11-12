import { assertSlotOpen } from "@/lib/availability";
import { renderContract } from "@/lib/contract";
import { studio } from "@/lib/config";
import { ValidationError } from "@/lib/errors";
import { quote } from "@/lib/pricing";
import { displayStatus } from "@/lib/status";
import type { AddonSelection, Booking, Intake, Settings } from "@/lib/types";

function touch(booking: Booking, now: Date, patch: Partial<Booking>): Booking {
  return { ...booking, ...patch, updatedAt: now.toISOString() };
}

export function planHold(args: {
  id: string;
  now: Date;
  packageId: string;
  addons: AddonSelection[];
  date: string;
  startTime: string;
  bookings: Booking[];
  settings: Settings;
}): Booking {
  const priced = quote(args.packageId, args.addons);
  assertSlotOpen({
    date: args.date,
    startTime: args.startTime,
    durationMinutes: priced.durationMinutes,
    bookings: args.bookings,
    settings: args.settings,
    now: args.now,
  });

  const iso = args.now.toISOString();
  return {
    id: args.id,
    createdAt: iso,
    updatedAt: iso,
    status: "held",
    packageId: priced.packageId,
    addons: args.addons.filter((item) => item.quantity > 0),
    date: args.date,
    startTime: args.startTime,
    timezone: studio.timezone,
    quote: priced,
    holdExpiresAt: new Date(args.now.getTime() + studio.holdMinutes * 60_000).toISOString(),
    payment: { status: "unpaid", amountCents: priced.dueNowCents },
    reminders: {},
  };
}

export function planIntake(booking: Booking, intake: Intake, now: Date): Booking {
  if (booking.contract) throw new ValidationError("Details are locked after the agreement is signed.");
  if (displayStatus(booking, now) !== "held") {
    throw new ValidationError("This hold is no longer open for details.");
  }
  return touch(booking, now, {
    intake,
    holdExpiresAt: new Date(now.getTime() + studio.holdMinutes * 60_000).toISOString(),
  });
}

export function planSignature(booking: Booking, signerName: string, agreed: boolean, now: Date): Booking {
  if (booking.contract) return booking;
  if (displayStatus(booking, now) !== "held") {
    throw new ValidationError("This hold expired before it was signed. Choose the time again.");
  }
  if (!booking.intake) throw new ValidationError("Event details are required before signing.");
  if (!agreed) throw new ValidationError("Confirm the agreement to continue.");
  const name = signerName.trim().replace(/\s+/g, " ");
  if (name.length < 2) throw new ValidationError("Type your full name to sign.");
  const signedAt = now.toISOString();
  return touch(booking, now, {
    status: "pending_payment",
    holdExpiresAt: new Date(now.getTime() + studio.paymentWindowHours * 3_600_000).toISOString(),
    contract: {
      templateVersion: studio.contractVersion,
      body: renderContract(booking, { name, signedAt }),
      signerName: name,
      agreed: true,
      signedAt,
    },
  });
}

export function planCancel(booking: Booking, now: Date, by: "client" | "admin"): Booking {
  if (booking.status === "cancelled") return booking;
  if (by === "client" && booking.status === "paid") {
    throw new ValidationError("A paid reservation stays on the books. Write the studio to change it.");
  }
  if (by === "client" && displayStatus(booking, now) === "expired") return booking;
  return touch(booking, now, { status: "cancelled" });
}
