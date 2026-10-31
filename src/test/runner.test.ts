import { describe, expect, it } from "vitest";
import { sameValue } from "@/lib/runner.server";
describe("runner output comparison", () => {
  it("preserves whitespace inside strings", () => expect(sameValue('"a b"', '"ab"')).toBe(false));
  it("preserves literal boolean words in strings", () => expect(sameValue('"True"', '"true"')).toBe(false));
  it("preserves apostrophes", () => expect(sameValue(JSON.stringify("it's"), JSON.stringify('it"s'))).toBe(false));
  it("ignores JSON formatting but not values", () => {
    expect(sameValue('[1, true, null]', '[1,true,null]')).toBe(true);
    expect(sameValue('[1,2]', '[2,1]')).toBe(false);
  });
  it("compares object keys independently of order", () => expect(sameValue('{"a":1,"b":2}', '{"b":2,"a":1}')).toBe(true));
  it("rejects invalid JSON even when identical", () => expect(sameValue('ERROR', 'ERROR')).toBe(false));
});
