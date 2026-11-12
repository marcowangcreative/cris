"use client";

import { useState, type FormEvent } from "react";

export function InquiryForm({
  packages,
  initialPackage,
}: {
  packages: { id: string; name: string }[];
  initialPackage: string;
}) {
  const [packageId, setPackageId] = useState(
    packages.some((item) => item.id === initialPackage) ? initialPackage : packages[0]?.id ?? "",
  );
  const [fields, setFields] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    eventDate: "",
    venue: "",
    message: "",
  });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, ...fields }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "The note did not send.");
      window.location.href = "/inquiry/thanks";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The note did not send.");
      setPending(false);
    }
  }

  function set(key: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label className="field" htmlFor="packageId">
        <span>Collection</span>
        <select id="packageId" value={packageId} onChange={(event) => setPackageId(event.target.value)}>
          {packages.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field" htmlFor="firstName">
        <span>First name</span>
        <input id="firstName" value={fields.firstName} onChange={(event) => set("firstName", event.target.value)} autoComplete="given-name" required />
      </label>
      <label className="field" htmlFor="lastName">
        <span>Last name</span>
        <input id="lastName" value={fields.lastName} onChange={(event) => set("lastName", event.target.value)} autoComplete="family-name" required />
      </label>
      <label className="field" htmlFor="email">
        <span>Email</span>
        <input id="email" type="email" value={fields.email} onChange={(event) => set("email", event.target.value)} autoComplete="email" required />
      </label>
      <label className="field" htmlFor="phone">
        <span>Phone</span>
        <input id="phone" type="tel" value={fields.phone} onChange={(event) => set("phone", event.target.value)} autoComplete="tel" />
      </label>
      <label className="field" htmlFor="eventDate">
        <span>Event date</span>
        <input id="eventDate" type="date" value={fields.eventDate} onChange={(event) => set("eventDate", event.target.value)} />
      </label>
      <label className="field" htmlFor="venue">
        <span>Venue</span>
        <input id="venue" value={fields.venue} onChange={(event) => set("venue", event.target.value)} />
      </label>
      <label className="field" htmlFor="message">
        <span>What should we know?</span>
        <textarea id="message" value={fields.message} onChange={(event) => set("message", event.target.value)} required />
      </label>
      {error ? <p className="alert" role="alert">{error}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send the note"}
      </button>
    </form>
  );
}
