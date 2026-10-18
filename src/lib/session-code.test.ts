import { describe, expect, it } from "vitest";
import { formatSessionCode, generateSessionCode, isValidSessionCode, normalizeCodeInput } from "./session-code";

describe("session code", () => {
  it("generates exactly 8 digits", () => {
    for (let i = 0; i < 200; i++) expect(generateSessionCode()).toMatch(/^[0-9]{8}$/);
  });
  it("rejects codes that are not 8 digits", () => {
    expect(isValidSessionCode("1234567")).toBe(false);
    expect(isValidSessionCode("12345678")).toBe(true);
    expect(isValidSessionCode("1234567a")).toBe(false);
  });
  it("formats and normalizes", () => {
    expect(formatSessionCode("12345678")).toBe("1234 5678");
    expect(normalizeCodeInput("12 34-56 789")).toBe("12345678");
  });
});
