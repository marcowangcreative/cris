import { formatUsd } from "@/lib/format";
import { RULES } from "@/lib/rules";

export const WEDDING_INTRO =
  "Wedding hair and makeup, thoughtfully planned around your celebration. Explore individual services or an all-inclusive bridal journey, tailored through a personal consultation. Inquire for availability.";

export const publicCopy = {
  minimum: formatUsd(RULES.transformationMinimumCents),
  deposit: formatUsd(RULES.depositCents),
  weddingIntro: WEDDING_INTRO,
  bookingTerms:
    "Placeholder. Cancellation, rescheduling, and refund terms are an open owner decision. They are not stated on this page, and this demo does not invent them.",
  prep: "Placeholder. Prep instructions are not published yet. They will replace this note after the owner approves the wording.",
  aftercare:
    "Placeholder. Aftercare is not published yet. Nothing here is a care plan.",
  unsuitableConsult:
    "Placeholder. What happens when a consultation shows the service is not a fit is an open owner decision.",
  bridalPricing:
    "Scope, pricing, availability, and cancellation terms are not published for weddings. The studio confirms them in consultation. An inquiry does not reserve a date.",
};

export const WEEKDAY_LABELS = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
