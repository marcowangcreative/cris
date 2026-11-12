"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MonthCalendar } from "@/components/month-calendar";
import { studio } from "@/lib/config";
import {
  formatDuration,
  formatLongDate,
  formatMoney,
  formatTime,
  formatTimeRange,
  formatTimestamp,
} from "@/lib/format";
import { quote } from "@/lib/pricing";
import type { AvailabilityMonth, PackageDefinition, PublicBooking, TableSource } from "@/lib/types";
import { venueChecks } from "@/lib/venue";

type Step = "date" | "details" | "agreement" | "payment";

const STEPS: { id: Step; label: string }[] = [
  { id: "date", label: "Date" },
  { id: "details", label: "Details" },
  { id: "agreement", label: "Agreement" },
  { id: "payment", label: "Payment" },
];

type IntakeState = {
  clientName: string;
  clientEmail: string;
  eventName: string;
  venueAddress: string;
  guestHeadcount: string;
  loadInNotes: string;
  onSiteContactName: string;
  onSiteContactPhone: string;
  galleryEmail: string;
  venueSpace: boolean;
  venuePower: boolean;
  venueWifi: boolean;
  venueTable: boolean;
  tableSource: "" | TableSource;
  ceilingHeight: string;
  outletNotes: string;
  setupWindow: string;
};

function emptyIntake(booking: PublicBooking | null): IntakeState {
  return {
    clientName: booking?.intake?.clientName ?? "",
    clientEmail: booking?.intake?.clientEmail ?? "",
    eventName: booking?.intake?.eventName ?? "",
    venueAddress: booking?.intake?.venueAddress ?? "",
    guestHeadcount: booking?.intake ? String(booking.intake.guestHeadcount) : "",
    loadInNotes: booking?.intake?.loadInNotes ?? "",
    onSiteContactName: booking?.intake?.onSiteContactName ?? "",
    onSiteContactPhone: booking?.intake?.onSiteContactPhone ?? "",
    galleryEmail: booking?.intake?.galleryEmail ?? "",
    venueSpace: booking?.intake?.venueSpace ?? false,
    venuePower: booking?.intake?.venuePower ?? false,
    venueWifi: booking?.intake?.venueWifi ?? false,
    venueTable: booking?.intake?.venueTable ?? false,
    tableSource: booking?.intake?.tableSource ?? "",
    ceilingHeight: booking?.intake?.ceilingHeight ?? "",
    outletNotes: booking?.intake?.outletNotes ?? "",
    setupWindow: booking?.intake?.setupWindow ?? "",
  };
}

function resolveStep(booking: PublicBooking | null, requested?: string): Step {
  const ask = STEPS.some((step) => step.id === requested) ? (requested as Step) : undefined;
  if (!booking || booking.displayStatus === "expired" || booking.displayStatus === "cancelled") return "date";
  if (!booking.intake) return ask === "date" ? "date" : "details";
  if (!booking.contract) return ask === "date" || ask === "details" ? ask : "agreement";
  if (ask === "details") return "agreement";
  return ask ?? "payment";
}

async function sendJson(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string; booking?: PublicBooking; contractPreview?: string; url?: string };
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export function BookingWizard({
  pkg,
  initialBooking,
  requestedStep,
  minMonth,
  maxMonth,
  paymentsSimulated,
}: {
  pkg: PackageDefinition;
  initialBooking: PublicBooking | null;
  requestedStep?: string;
  minMonth: string;
  maxMonth: string;
  paymentsSimulated: boolean;
}) {
  const router = useRouter();
  const starting =
    initialBooking && initialBooking.displayStatus !== "expired" && initialBooking.displayStatus !== "cancelled"
      ? initialBooking
      : null;
  const [booking, setBooking] = useState<PublicBooking | null>(starting);
  const [step, setStep] = useState<Step>(resolveStep(starting, requestedStep));
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const addon of starting?.addons ?? []) initial[addon.id] = addon.quantity;
    return initial;
  });
  const [month, setMonth] = useState(starting?.date.slice(0, 7) ?? minMonth);
  const [calendar, setCalendar] = useState<AvailabilityMonth | null>(null);
  const [loadingDays, setLoadingDays] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [intake, setIntake] = useState<IntakeState>(emptyIntake(starting));
  const [contractText, setContractText] = useState(starting?.contract?.body ?? "");
  const [signerName, setSignerName] = useState(starting?.contract?.signerName ?? "");
  const [agreed, setAgreed] = useState(Boolean(starting?.contract));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const addonKey = pkg.addons.map((addon) => `${addon.id}:${quantities[addon.id] ?? 0}`).join(",");
  const preview = useMemo(
    () =>
      quote(
        pkg.id,
        pkg.addons
          .filter((addon) => (quantities[addon.id] ?? 0) > 0)
          .map((addon) => ({ id: addon.id, quantity: quantities[addon.id] ?? 0 })),
      ),
    [pkg, quantities],
  );
  const holding = Boolean(booking && (booking.displayStatus === "held" || booking.displayStatus === "pending_payment"));
  const priced = holding && booking ? booking.quote : preview;
  const selectedDay = calendar?.days.find((day) => day.date === selectedDate && day.status === "open");

  useEffect(() => {
    if (step !== "date" || holding) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ month, packageId: pkg.id });
    if (addonKey.split(":").some((part, index) => index % 2 === 1 && part !== "0")) {
      params.set(
        "addons",
        pkg.addons
          .filter((addon) => (quantities[addon.id] ?? 0) > 0)
          .map((addon) => `${addon.id}:${quantities[addon.id]}`)
          .join(","),
      );
    }
    setLoadingDays(true);
    fetch(`/api/availability?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as AvailabilityMonth & { error?: string };
        if (!response.ok) throw new Error(data.error || "The calendar did not load.");
        return data;
      })
      .then((data) => {
        setCalendar(data);
        setError("");
        setSelectedDate((current) => (data.days.some((day) => day.date === current && day.status === "open") ? current : ""));
        setSelectedTime("");
      })
      .catch((caught: Error) => {
        if (caught.name === "AbortError") return;
        setError(caught.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingDays(false);
      });
    return () => controller.abort();
  }, [addonKey, holding, month, pkg.id, step]);

  useEffect(() => {
    if (step !== "agreement" || !booking) return;
    if (booking.contract) {
      setContractText(booking.contract.body);
      return;
    }
    let cancelled = false;
    fetch(`/api/bookings/${booking.id}/contract`, { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { text?: string; error?: string };
        if (!response.ok) throw new Error(data.error || "The agreement did not load.");
        return data.text ?? "";
      })
      .then((text) => {
        if (!cancelled) setContractText(text);
      })
      .catch((caught: Error) => {
        if (!cancelled) setError(caught.message);
      });
    return () => {
      cancelled = true;
    };
  }, [booking, step]);

  function remember(next: Step, id: string) {
    setStep(next);
    router.replace(`/book/${pkg.id}?booking=${id}&step=${next}`, { scroll: false });
  }

  async function hold(event: FormEvent) {
    event.preventDefault();
    if (!selectedDay || !selectedTime) return;
    setPending(true);
    setError("");
    try {
      const data = await sendJson("/api/bookings", "POST", {
        packageId: pkg.id,
        date: selectedDate,
        startTime: selectedTime,
        addons: pkg.addons
          .filter((addon) => (quantities[addon.id] ?? 0) > 0)
          .map((addon) => ({ id: addon.id, quantity: quantities[addon.id] })),
      });
      if (!data.booking) throw new Error("The hold did not save.");
      setBooking(data.booking);
      remember("details", data.booking.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That time could not be held.");
    } finally {
      setPending(false);
    }
  }

  async function saveDetails(event: FormEvent) {
    event.preventDefault();
    if (!booking) return;
    if (!intake.venueSpace || !intake.venuePower || !intake.venueWifi || !intake.venueTable) {
      setError("Confirm the space, power, Wi-Fi, and a table before continuing.");
      return;
    }
    if (intake.tableSource !== "venue" && intake.tableSource !== "studio") {
      setError("Tell us whether the venue provides the table.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const data = await sendJson(`/api/bookings/${booking.id}`, "PATCH", {
        intake: { ...intake, guestHeadcount: Number(intake.guestHeadcount) },
      });
      if (!data.booking) throw new Error("The details did not save.");
      setBooking(data.booking);
      if (data.contractPreview) setContractText(data.contractPreview);
      remember("agreement", data.booking.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Those details could not be saved.");
    } finally {
      setPending(false);
    }
  }

  async function sign(event: FormEvent) {
    event.preventDefault();
    if (!booking) return;
    setPending(true);
    setError("");
    try {
      const data = await sendJson(`/api/bookings/${booking.id}/sign`, "POST", { signerName, agreed });
      if (!data.booking) throw new Error("The signature did not save.");
      setBooking(data.booking);
      remember("payment", data.booking.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The agreement could not be signed.");
    } finally {
      setPending(false);
    }
  }

  async function pay() {
    if (!booking) return;
    setPending(true);
    setError("");
    try {
      const data = await sendJson("/api/checkout", "POST", { bookingId: booking.id });
      if (!data.url) throw new Error("Payment could not start.");
      const target = window.top ?? window;
      target.location.href = data.url;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payment could not start.");
      setPending(false);
    }
  }

  async function release() {
    if (!booking) return;
    setPending(true);
    setError("");
    try {
      await sendJson(`/api/bookings/${booking.id}/cancel`, "POST");
      setBooking(null);
      setStep("date");
      router.replace(`/book/${pkg.id}`, { scroll: false });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The hold could not be released.");
    } finally {
      setPending(false);
    }
  }

  function go(next: Step) {
    if (next === "date") setStep("date");
    if (!booking) return;
    if (next === "details" && !booking.contract) setStep("details");
    if (next === "agreement" && booking.intake) setStep("agreement");
    if (next === "payment" && booking.contract) setStep("payment");
  }

  return (
    <div className="split">
      <aside className="aside">
        <Link className="aside-mark" href="/">
          Camara Wong
        </Link>
        <div>
          <p className="eyebrow">Reserve</p>
          <h1>{pkg.name}</h1>
          <p className="meta">
            {formatDuration(priced.durationMinutes)} · {studio.city}
          </p>
        </div>
        <ol className="step-list">
          {STEPS.map((item, index) => (
            <li key={item.id}>
              <button type="button" aria-current={step === item.id ? "step" : undefined} onClick={() => go(item.id)}>
                0{index + 1} {item.label}
              </button>
            </li>
          ))}
        </ol>
        <div className="aside-price">
          <span className="meta">{priced.paymentMode === "full" ? "Due today, in full" : `Due today · ${priced.depositPercent}% deposit`}</span>
          <strong>{formatMoney(priced.dueNowCents)}</strong>
          <span className="meta">
            Investment {formatMoney(priced.totalCents)}
            {priced.balanceDueCents > 0 ? ` · balance ${formatMoney(priced.balanceDueCents)}` : ""}
          </span>
          {priced.includesPlaceholderPrice ? <span className="flag">Placeholder price</span> : null}
        </div>
      </aside>

      <section className="stage">
        {step === "date" && holding && booking ? (
          <div className="stack">
            <h2>This time is held.</h2>
            <p>
              {formatLongDate(booking.date)}
              <br />
              {formatTimeRange(booking.startTime, booking.quote.durationMinutes)}
            </p>
            <p className="meta">Held until {formatTimestamp(booking.holdExpiresAt)}.</p>
            <div className="actions">
              <button className="button" type="button" onClick={() => setStep(booking.intake ? "agreement" : "details")}>
                Continue
              </button>
              {booking.displayStatus === "held" || booking.displayStatus === "pending_payment" ? (
                <button className="button-ghost" type="button" onClick={release} disabled={pending}>
                  Release this date
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === "date" && !holding ? (
          <form onSubmit={hold}>
            <h2>Choose the hour.</h2>
            <p>Mondays are closed. {calendar?.maxEventsPerDate === 1 ? "One event can be reserved each day." : `Up to ${calendar?.maxEventsPerDate ?? studio.defaultMaxEventsPerDate} events can share a date if the times do not overlap.`}</p>
            {pkg.addons.map((addon) => {
              const quantity = quantities[addon.id] ?? 0;
              return (
                <div className="addon" key={addon.id}>
                  <div>
                    <h3>{addon.name}</h3>
                    <p>{addon.description}</p>
                    <p className="meta">
                      {formatMoney(addon.priceCents)}
                      {addon.priceIsPlaceholder ? " · placeholder" : ""}
                    </p>
                  </div>
                  <div className="stepper">
                    <button
                      type="button"
                      aria-label={`Fewer ${addon.name}`}
                      onClick={() => setQuantities((current) => ({ ...current, [addon.id]: Math.max(0, quantity - 1) }))}
                      disabled={quantity === 0}
                    >
                      –
                    </button>
                    <span>{quantity}</span>
                    <button
                      type="button"
                      aria-label={`More ${addon.name}`}
                      onClick={() =>
                        setQuantities((current) => ({
                          ...current,
                          [addon.id]: Math.min(addon.maxQuantity, quantity + 1),
                        }))
                      }
                      disabled={quantity >= addon.maxQuantity}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
            {calendar ? (
              <MonthCalendar
                month={month}
                firstWeekday={calendar.firstWeekday}
                days={calendar.days}
                selectedDate={selectedDate}
                minMonth={minMonth}
                maxMonth={maxMonth}
                loading={loadingDays}
                onMonth={(next) => {
                  setMonth(next);
                  setSelectedTime("");
                }}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTime("");
                }}
              />
            ) : (
              <p>{loadingDays ? "Looking up open dates." : "The calendar is loading."}</p>
            )}
            {selectedDay ? (
              <div className="times" role="group" aria-label="Start times">
                {selectedDay.startTimes.map((time) => (
                  <button
                    key={time}
                    type="button"
                    aria-pressed={selectedTime === time}
                    onClick={() => setSelectedTime(time)}
                  >
                    {formatTime(time)}
                    <br />
                    <small>until {formatTimeRange(time, preview.durationMinutes).split(" – ")[1]}</small>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="actions">
              <button className="button" type="submit" disabled={!selectedTime || pending}>
                {pending ? "Holding…" : "Hold this time"}
              </button>
            </div>
          </form>
        ) : null}

        {step === "details" && booking ? (
          <form onSubmit={saveDetails}>
            <h2>Tell us about the room.</h2>
            <p>
              {formatLongDate(booking.date)} · {formatTimeRange(booking.startTime, booking.quote.durationMinutes)}
            </p>
            <div className="form-grid">
              <Field id="clientName" label="Your name" value={intake.clientName} autoComplete="name" onChange={(value) => setIntake({ ...intake, clientName: value })} />
              <Field id="clientEmail" label="Your email" type="email" value={intake.clientEmail} autoComplete="email" onChange={(value) => setIntake({ ...intake, clientEmail: value })} />
              <Field id="eventName" label="Event name" value={intake.eventName} onChange={(value) => setIntake({ ...intake, eventName: value })} />
              <Field id="venueAddress" label="Venue address" value={intake.venueAddress} autoComplete="street-address" onChange={(value) => setIntake({ ...intake, venueAddress: value })} />
              <Field id="guestHeadcount" label="Guest headcount" value={intake.guestHeadcount} inputMode="numeric" onChange={(value) => setIntake({ ...intake, guestHeadcount: value })} />
              <fieldset className="checks">
                <legend>What we need from the venue</legend>
                <p className="hint">Confirm the room can hold the station. These four are required.</p>
                {venueChecks.map((item) => (
                  <label className="agree" key={item.field}>
                    <input
                      type="checkbox"
                      checked={intake[item.field]}
                      onChange={(event) => setIntake({ ...intake, [item.field]: event.target.checked })}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
                <p className="hint">Who provides the table? Ours is 4 ft.</p>
                <label className="agree">
                  <input
                    type="radio"
                    name="tableSource"
                    checked={intake.tableSource === "venue"}
                    onChange={() => setIntake({ ...intake, tableSource: "venue" })}
                  />
                  <span>The venue provides the table</span>
                </label>
                <label className="agree">
                  <input
                    type="radio"
                    name="tableSource"
                    checked={intake.tableSource === "studio"}
                    onChange={() => setIntake({ ...intake, tableSource: "studio" })}
                  />
                  <span>Please bring your 4 ft table</span>
                </label>
              </fieldset>
              <p className="hint">Ceiling height, the outlet, and the load-in window are notes for the crew. They do not block the booking.</p>
              <label className="field" htmlFor="ceilingHeight">
                <span>Ceiling height</span>
                <input
                  id="ceilingHeight"
                  value={intake.ceilingHeight}
                  onChange={(event) => setIntake({ ...intake, ceilingHeight: event.target.value })}
                />
                <p className="hint">A 65-inch umbrella on a stand stands taller than the backdrop, which is about 8 ft.</p>
              </label>
              <label className="field" htmlFor="outletNotes">
                <span>Outlet distance or a dedicated circuit</span>
                <textarea id="outletNotes" value={intake.outletNotes} onChange={(event) => setIntake({ ...intake, outletNotes: event.target.value })} />
              </label>
              <label className="field" htmlFor="setupWindow">
                <span>Load-in / setup window</span>
                <input
                  id="setupWindow"
                  value={intake.setupWindow}
                  placeholder="For example, 3:00–4:00 PM"
                  onChange={(event) => setIntake({ ...intake, setupWindow: event.target.value })}
                />
              </label>
              <label className="field" htmlFor="loadInNotes">
                <span>Load-in and parking</span>
                <textarea id="loadInNotes" value={intake.loadInNotes} onChange={(event) => setIntake({ ...intake, loadInNotes: event.target.value })} />
              </label>
              <Field id="onSiteContactName" label="On-site contact" value={intake.onSiteContactName} onChange={(value) => setIntake({ ...intake, onSiteContactName: value })} />
              <Field id="onSiteContactPhone" label="On-site phone" type="tel" value={intake.onSiteContactPhone} autoComplete="tel" onChange={(value) => setIntake({ ...intake, onSiteContactPhone: value })} />
              <Field id="galleryEmail" label="Email for the QR gallery" type="email" value={intake.galleryEmail} onChange={(value) => setIntake({ ...intake, galleryEmail: value })} />
            </div>
            <div className="actions">
              <button className="button" type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save details"}
              </button>
            </div>
          </form>
        ) : null}

        {step === "agreement" && booking ? (
          <form onSubmit={sign}>
            <h2>Read it, then sign.</h2>
            <pre className="contract">{contractText || "Preparing the agreement."}</pre>
            {booking.contract ? (
              <p>Signed by {booking.contract.signerName} · {formatTimestamp(booking.contract.signedAt)}</p>
            ) : (
              <>
                <label className="field signature" htmlFor="signerName">
                  <span>Type your full name</span>
                  <input id="signerName" value={signerName} onChange={(event) => setSignerName(event.target.value)} autoComplete="name" required />
                </label>
                <label className="agree">
                  <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
                  <span>I have read this agreement and I intend my typed name to be my signature.</span>
                </label>
              </>
            )}
            <div className="actions">
              {booking.contract ? (
                <button className="button" type="button" onClick={() => remember("payment", booking.id)}>
                  Continue to payment
                </button>
              ) : (
                <button className="button" type="submit" disabled={pending || !agreed || signerName.trim().length < 2}>
                  {pending ? "Signing…" : "Sign and continue"}
                </button>
              )}
            </div>
          </form>
        ) : null}

        {step === "payment" && booking ? (
          <div>
            <h2>{booking.quote.paymentMode === "full" ? "Pay in full." : "Pay the deposit."}</h2>
            <ul className="includes">
              {booking.quote.lineItems.map((item) => (
                <li key={item.id}>
                  {item.label} · {formatMoney(item.amountCents)}
                  {item.placeholder ? " · placeholder" : ""}
                </li>
              ))}
            </ul>
            <p className="price">{formatMoney(booking.quote.dueNowCents)}</p>
            <p>
              {booking.quote.balanceDueCents > 0
                ? `${formatMoney(booking.quote.balanceDueCents)} remains, due seven days before the event. This checkout collects the deposit only.`
                : "Nothing is due after this payment."}
            </p>
            {paymentsSimulated ? <p>Stripe is not connected here, so the next screen simulates the card without charging it.</p> : <p>You will finish on Stripe’s secure checkout.</p>}
            {booking.contract ? <p className="meta">Signed {formatTimestamp(booking.contract.signedAt)} by {booking.contract.signerName}.</p> : null}
            <div className="actions">
              <button className="button" type="button" onClick={pay} disabled={pending}>
                {pending ? "Starting…" : paymentsSimulated ? "Continue to demo payment" : "Continue to payment"}
              </button>
              <button className="button-ghost" type="button" onClick={release} disabled={pending}>
                Release this date
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "text" | "tel" | "email";
}) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  );
}
