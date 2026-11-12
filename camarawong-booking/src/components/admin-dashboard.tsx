"use client";

import { useEffect, useState, type FormEvent } from "react";
import { formatLongDate, formatMoney, formatTime, formatTimestamp, paymentSummary } from "@/lib/format";
import type { Inquiry, PublicBooking, Settings } from "@/lib/types";
import { vscoWorkspaceSummary } from "@/lib/vsco";

const FILTERS = [
  ["all", "All"],
  ["paid", "Paid"],
  ["pending_payment", "Awaiting payment"],
  ["held", "Held"],
  ["expired", "Expired"],
  ["cancelled", "Cancelled"],
] as const;

const STATUS_LABEL: Record<string, string> = {
  held: "Held",
  pending_payment: "Awaiting payment",
  paid: "Paid",
  cancelled: "Cancelled",
  expired: "Expired",
};

export function AdminDashboard() {
  const [bookings, setBookings] = useState<PublicBooking[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [copied, setCopied] = useState("");
  const [blockDate, setBlockDate] = useState("");
  const [maxEvents, setMaxEvents] = useState("1");
  const [error, setError] = useState("");

  async function reload() {
    const response = await fetch("/api/admin/bookings", { cache: "no-store" });
    if (response.status === 401) {
      window.location.href = "/admin";
      return;
    }
    const data = (await response.json()) as {
      bookings: PublicBooking[];
      inquiries: Inquiry[];
      settings: Settings;
      error?: string;
    };
    if (!response.ok) {
      setError(data.error || "The book did not load.");
      return;
    }
    setBookings(data.bookings);
    setInquiries(data.inquiries);
    setSettings(data.settings);
    setMaxEvents(String(data.settings.maxEventsPerDate));
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function post(url: string, body?: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(data.error || "That change did not save.");
  }

  async function onBlock(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await post("/api/admin/settings", { action: "block", date: blockDate });
      setBlockDate("");
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The date was not blocked.");
    }
  }

  async function onMax(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await post("/api/admin/settings", { action: "max", maxEventsPerDate: Number(maxEvents) });
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The limit was not saved.");
    }
  }

  const visible = bookings.filter((booking) => filter === "all" || booking.displayStatus === filter);

  return (
    <main className="desk">
      <div className="desk-head">
        <div>
          <p className="eyebrow">Staff desk</p>
          <h1>Bookings</h1>
        </div>
        <div className="actions">
          <a className="button" href="/api/admin/export">
            Export CSV
          </a>
          <button
            className="button-ghost"
            type="button"
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST" });
              window.location.href = "/admin";
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <section className="panel" aria-labelledby="limits-title">
        <h2 id="limits-title">The calendar</h2>
        <form className="form-grid" onSubmit={onMax}>
          <label className="field" htmlFor="maxEvents">
            <span>Max events per date</span>
            <input id="maxEvents" inputMode="numeric" value={maxEvents} onChange={(event) => setMaxEvents(event.target.value)} />
          </label>
          <button className="button" type="submit">
            Save limit
          </button>
        </form>
        <form className="form-grid" onSubmit={onBlock}>
          <label className="field" htmlFor="blockDate">
            <span>Block a date</span>
            <input id="blockDate" type="date" value={blockDate} onChange={(event) => setBlockDate(event.target.value)} required />
          </label>
          <button className="button" type="submit">
            Block date
          </button>
        </form>
        <ul className="includes">
          {(settings?.blockedDates ?? []).map((date) => (
            <li key={date}>
              {formatLongDate(date)}{" "}
              <button
                className="text-link"
                type="button"
                onClick={async () => {
                  await post("/api/admin/settings", { action: "unblock", date });
                  await reload();
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="filters" role="group" aria-label="Filter bookings">
        {FILTERS.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? <p>Nothing in this filter.</p> : null}
      {visible.map((booking) => {
        const summary = vscoWorkspaceSummary(booking);
        const open = openId === booking.id;
        return (
          <article className="desk-card" key={booking.id}>
            <button className="desk-row" type="button" aria-expanded={open} onClick={() => setOpenId(open ? null : booking.id)}>
              <span>{formatLongDate(booking.date)}</span>
              <span>{booking.intake?.eventName ?? "Untitled hold"}</span>
              <span>{booking.quote.packageName}</span>
              <span className="status">{STATUS_LABEL[booking.displayStatus] ?? booking.displayStatus}</span>
            </button>
            {open ? (
              <div className="desk-detail">
                <dl className="facts">
                  <dt>Time</dt>
                  <dd>{formatTime(booking.startTime)} · {booking.quote.durationMinutes} min</dd>
                  <dt>Venue</dt>
                  <dd>{booking.intake?.venueAddress ?? "—"}</dd>
                  <dt>Guests</dt>
                  <dd>{booking.intake?.guestHeadcount ?? "—"}</dd>
                  <dt>On site</dt>
                  <dd>
                    {booking.intake ? `${booking.intake.onSiteContactName} · ${booking.intake.onSiteContactPhone}` : "—"}
                  </dd>
                  <dt>Load-in</dt>
                  <dd>{booking.intake?.loadInNotes || "—"}</dd>
                  <dt>Gallery</dt>
                  <dd>{booking.intake?.galleryEmail ?? "—"}</dd>
                  <dt>Client</dt>
                  <dd>{booking.intake ? `${booking.intake.clientName} · ${booking.intake.clientEmail}` : "—"}</dd>
                  <dt>Payment</dt>
                  <dd>
                    {paymentSummary(booking)}
                    {booking.payment.provider ? ` · ${booking.payment.provider}` : ""}
                    {booking.payment.paidAt ? ` · ${formatTimestamp(booking.payment.paidAt)}` : ""}
                    {booking.quote.balanceDueCents > 0 ? ` · balance ${formatMoney(booking.quote.balanceDueCents)}` : ""}
                  </dd>
                </dl>
                {booking.contract ? (
                  <div>
                    <p className="meta">
                      Signed by {booking.contract.signerName} · {formatTimestamp(booking.contract.signedAt)}
                    </p>
                    <pre className="contract">{booking.contract.body}</pre>
                  </div>
                ) : (
                  <p>No signature yet.</p>
                )}
                <div>
                  <p className="meta">Copy to VSCO Workspace</p>
                  <pre className="summary">{summary}</pre>
                  <button
                    className="button"
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(summary);
                        setCopied(booking.id);
                      } catch {
                        setError("Copy was blocked. Select the summary and copy it by hand.");
                      }
                    }}
                  >
                    {copied === booking.id ? "Copied" : "Copy summary"}
                  </button>
                </div>
                {booking.displayStatus !== "cancelled" ? (
                  <button
                    className="button-ghost"
                    type="button"
                    onClick={async () => {
                      if (!window.confirm("Cancel this booking and free the date? A Stripe charge is not refunded here.")) return;
                      await post(`/api/admin/bookings/${booking.id}/cancel`);
                      await reload();
                    }}
                  >
                    Cancel booking
                  </button>
                ) : null}
                {booking.payment.status === "paid" ? (
                  <p className="meta">Refunds are done in the Stripe dashboard. Cancelling here only frees the date.</p>
                ) : null}
              </div>
            ) : null}
          </article>
        );
      })}

      <section>
        <h2>Inquiries</h2>
        {inquiries.length === 0 ? <p>No inquiries yet.</p> : null}
        {inquiries.map((inquiry) => (
          <article className="desk-card" key={inquiry.id}>
            <p>
              <strong>
                {inquiry.firstName} {inquiry.lastName}
              </strong>{" "}
              · {inquiry.packageName}
            </p>
            <p>
              {inquiry.email}
              {inquiry.phone ? ` · ${inquiry.phone}` : ""}
            </p>
            <p>
              {inquiry.eventDate || "Date not set"} · {inquiry.venue || "Venue not set"}
            </p>
            <p>{inquiry.message}</p>
          </article>
        ))}
      </section>
      {error ? <p className="alert" role="alert">{error}</p> : null}
    </main>
  );
}
