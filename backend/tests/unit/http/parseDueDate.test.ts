import { parseDueDate } from "../../../src/infrastructure/http/schemas/taskSchemas";

describe("parseDueDate", () => {
  it("returns undefined when value is undefined (do-not-touch semantics)", () => {
    expect(parseDueDate(undefined)).toBeUndefined();
  });

  it("returns null when value is null (clear-field semantics)", () => {
    expect(parseDueDate(null)).toBeNull();
  });

  it("returns null when value is an empty string", () => {
    expect(parseDueDate("")).toBeNull();
  });

  it("parses ISO date-only string into a valid Date", () => {
    const result = parseDueDate("2026-06-15");
    expect(result).toBeInstanceOf(Date);
    expect((result as Date).getUTCFullYear()).toBe(2026);
  });

  it("parses full ISO datetime into a valid Date", () => {
    const result = parseDueDate("2026-06-15T10:30:00Z");
    expect(result).toBeInstanceOf(Date);
    expect((result as Date).toISOString()).toBe("2026-06-15T10:30:00.000Z");
  });

  it("returns null for malformed date strings (defensive parsing)", () => {
    expect(parseDueDate("yesterday")).toBeNull();
    expect(parseDueDate("not-a-date")).toBeNull();
  });
});
