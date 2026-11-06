import { describe, expect, it } from "vitest";
import { isCreditError } from "@/lib/gemini-fallback.server";

describe("Gemini fallback trigger", () => {
  it("switches when Lovable credits are exhausted (402)", () => {
    expect(isCreditError({ statusCode: 402 })).toBe(true);
  });
  it("switches on a workspace credit limit (403 credit)", () => {
    expect(isCreditError({ statusCode: 403, message: "credit_limit_reached" })).toBe(true);
  });
  it("does not switch on ordinary server errors", () => {
    expect(isCreditError({ statusCode: 500, message: "boom" })).toBe(false);
  });
});
