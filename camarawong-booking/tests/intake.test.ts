import { describe, expect, it } from "vitest";
import { ValidationError } from "@/lib/errors";
import { parseIntake } from "@/lib/validation";
import { sampleIntake } from "./helpers";

const payload = {
  ...sampleIntake(),
  guestHeadcount: 80,
};

describe("venue intake", () => {
  it("requires the four venue confirmations and a table choice", () => {
    expect(parseIntake(payload).tableSource).toBe("venue");
    expect(() => parseIntake({ ...payload, venueWifi: false })).toThrow(ValidationError);
    expect(() => parseIntake({ ...payload, venueSpace: false })).toThrow(/12×12/);
    expect(() => parseIntake({ ...payload, tableSource: "" })).toThrow(/table/);
  });

  it("keeps ceiling, outlet, and setup window as notes", () => {
    const parsed = parseIntake({
      ...payload,
      tableSource: "studio",
      ceilingHeight: "8 ft",
      outletNotes: "",
      setupWindow: "",
    });
    expect(parsed.tableSource).toBe("studio");
    expect(parsed.ceilingHeight).toBe("8 ft");
    expect(parsed.outletNotes).toBe("");
    expect(parsed.setupWindow).toBe("");
  });
});
