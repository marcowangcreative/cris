/** Confirmed studio rules. Environment variables cannot lower these. */
export const RULES = {
  timezone: "America/Chicago",
  transformationMinimumCents: 120_000,
  depositCents: 60_000,
  publicStartHour: 10,
  publicStartMinute: 0,
  weekdaysPerWeek: 3,
  consultationFeeCents: 0,
  defaultConsultationMinutes: 30,
  /** Possible quote levels inside a proposal. Never a public package. */
  quoteLevelCents: [240_000, 360_000] as const,
  externalDepositType: "stripe_reservation_deposit" as const,
  externalDepositLabel: "Stripe reservation deposit",
} as const;

export type AppConfig = {
  demoMode: boolean;
  calendlyTransformationUrl: string;
  consultationDurationMinutes: number;
  releaseDayOfMonth: number;
  releaseLeadMonths: number;
  releaseLocalTime: string;
  webhookSecret: string;
  sessionSecret: string;
  timezone: typeof RULES.timezone;
};

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isInteger(value) ? value : fallback;
}

export function getConfig(): AppConfig {
  const minutes = intEnv(
    "CONSULTATION_DURATION_MINUTES",
    RULES.defaultConsultationMinutes,
  );
  const localTime = process.env.RELEASE_LOCAL_TIME ?? "09:00";
  return {
    demoMode: process.env.DEMO_MODE !== "false",
    calendlyTransformationUrl:
      process.env.NEXT_PUBLIC_CALENDLY_TRANSFORMATION_URL ||
      "https://calendly.com/example/private-transformation",
    consultationDurationMinutes:
      minutes >= 15 && minutes <= 180
        ? minutes
        : RULES.defaultConsultationMinutes,
    releaseDayOfMonth: Math.min(
      28,
      Math.max(1, intEnv("RELEASE_DAY_OF_MONTH", 1)),
    ),
    releaseLeadMonths: Math.max(1, intEnv("RELEASE_LEAD_MONTHS", 2)),
    releaseLocalTime: /^\d{2}:\d{2}$/.test(localTime) ? localTime : "09:00",
    webhookSecret:
      process.env.CALENDLY_WEBHOOK_SIGNING_SECRET ||
      "whsec_demo_only_not_a_real_secret",
    sessionSecret:
      process.env.DEMO_SESSION_SECRET || "demo-session-secret-change-me",
    timezone: RULES.timezone,
  };
}
