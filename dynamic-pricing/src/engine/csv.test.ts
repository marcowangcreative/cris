import { describe, expect, it } from "vitest";
import { csvTemplate, parseCsv, toCsv } from "./csv";
import type { CsvBooking } from "./csv";

const ROW: CsvBooking = {
  eventDate: "2027-10-16",
  inquiryDate: "2026-11-12",
  packageName: "Signature",
  quotedPrice: 12400,
  outcome: "booked",
  notes: "Peak Saturday, hold the quote",
  market: "Houston",
  couple: "Elena & James",
  travelDaysBlocked: 1,
  qualifiedInquiries: 2,
  bookedDates: 3,
  targetCapacity: 5,
};

describe("csv", () => {
  it("round-trips the documented columns, including commas in notes", () => {
    const withComma: CsvBooking = { ...ROW, notes: 'Said "yes", then asked about albums' };
    const parsed = parseCsv(toCsv([ROW, withComma]));
    expect(parsed.errors).toEqual([]);
    expect(parsed.records).toEqual([ROW, withComma]);
  });

  it("accepts spaced headers, dollar amounts, and a byte-order mark", () => {
    const text = `\uFEFFevent date,inquiry date,package,quoted price,outcome,notes
2027-04-11,2025-06-01,Signature,"$11,500",BOOKED,Spring wedding
`;
    const parsed = parseCsv(text);
    expect(parsed.errors).toEqual([]);
    expect(parsed.records[0]).toMatchObject({
      eventDate: "2027-04-11",
      inquiryDate: "2025-06-01",
      packageName: "Signature",
      quotedPrice: 11500,
      outcome: "booked",
      notes: "Spring wedding",
    });
  });

  it("reports a missing column, a bad outcome, and a bad date", () => {
    expect(parseCsv("event_date,package\n2027-10-16,Signature\n").errors[0].message).toContain("inquiry_date");
    const bad = parseCsv(
      "event_date,inquiry_date,package,quoted_price,outcome,notes\n2027-13-01,2026-11-12,Signature,100,maybe,note\n",
    );
    expect(bad.records).toEqual([]);
    expect(bad.errors[0].line).toBe(2);
    expect(bad.errors[0].message).toContain("event_date");
    expect(bad.errors[0].message).toContain("outcome");
  });

  it("keeps standard-rate fields for a backtest", () => {
    const parsed = parseCsv(
      `event_date,inquiry_date,package,quoted_price,outcome,notes,client_budget,charge_standard,manual_price,model_quote
2027-08-04,2027-02-04,Signature,10800,booked,Held the standard rate,15000,yes,10800,9350
`,
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.records[0]).toMatchObject({
      quotedPrice: 10800,
      clientBudget: 15000,
      chargeStandard: true,
      manualPrice: 10800,
      modelQuote: 9350,
    });
    const again = parseCsv(toCsv(parsed.records));
    expect(again.errors).toEqual([]);
    expect(again.records[0]).toMatchObject(parsed.records[0]);
  });

  it("ships a template that parses", () => {
    const parsed = parseCsv(csvTemplate());
    expect(parsed.errors).toEqual([]);
    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0].notes).toContain("EXAMPLE ROW");
  });
});
