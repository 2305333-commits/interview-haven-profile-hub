import { expect, test } from "vitest";
import { readiness, readinessLabel } from "@/components/SkillRadar";
test("readiness averages 0-10 ratings into percent", () => {
  expect(readiness([{ topic: "a", rating: 6 }, { topic: "b", rating: 8 }])).toBe(70);
  expect(readiness([])).toBe(0);
});
test("labels", () => { expect(readinessLabel(80)).toBe("Strong hire"); expect(readinessLabel(20)).toBe("Needs foundation"); });
