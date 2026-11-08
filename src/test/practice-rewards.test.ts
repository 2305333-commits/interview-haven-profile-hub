import { describe, expect, it } from "vitest";
import { dailyStreak, ratingEvents, topicBadges } from "@/lib/practice-rewards";

const at = (day: number, hour = 12) => new Date(2026, 10, day, hour).toISOString();
const event = (day: number, topic = "Arrays") => ({ topic, at: at(day) });

describe("topic practice badges", () => {
  it("earns one badge for each practiced topic, not each attempt or mode", () => {
    expect(topicBadges([event(5), event(6, "Coding: Arrays"), event(7, " arrays "), event(8, "DBMS")]))
      .toEqual([{ topic: "Arrays", earnedAt: at(5) }, { topic: "DBMS", earnedAt: at(8) }]);
  });
  it("counts saved graded attempts even when the score was zero, not unpracticed ratings", () => {
    expect(ratingEvents([
      { topic: "Arrays", attempts: 0, history: [], updated_at: at(8) },
      { topic: "DBMS", attempts: 1, history: [{ t: at(6), r: 0 }], updated_at: at(8) },
    ])).toEqual([event(6, "DBMS")]);
  });
  it("supports legacy rating records without timestamped history", () => {
    expect(ratingEvents([{ topic: "DBMS", attempts: 1, history: null, updated_at: at(8) }]))
      .toEqual([event(8, "DBMS")]);
  });
  it("does not award badges for invalid timestamps or empty topics", () => {
    expect(topicBadges([{ topic: "", at: at(8) }, { topic: "DBMS", at: "invalid" }])).toEqual([]);
  });
});

describe("daily practice streaks", () => {
  const now = new Date(2026, 10, 8, 18);
  it("counts at most one day for multiple completed practices", () => {
    expect(dailyStreak([event(6), event(7), event(8), event(8, "DBMS")], now).current).toBe(3);
  });
  it("keeps yesterday's streak alive until today ends", () => {
    const result = dailyStreak([event(6), event(7)], now);
    expect(result.current).toBe(2);
    expect(result.practicedToday).toBe(false);
  });
  it("resets after a missed day and retains the longest streak", () => {
    const result = dailyStreak([event(3), event(4), event(5)], now);
    expect(result.current).toBe(0);
    expect(result.best).toBe(3);
  });
  it("uses local calendar dates around midnight rather than UTC dates", () => {
    const result = dailyStreak([{ topic: "DBMS", at: new Date(2026, 10, 7, 23, 59).toISOString() },
      { topic: "Arrays", at: new Date(2026, 10, 8, 0, 1).toISOString() }], now);
    expect(result.current).toBe(2);
  });
  it("ignores future or invalid events and shows seven calendar days", () => {
    const result = dailyStreak([event(9), { topic: "DBMS", at: "invalid" }], now);
    expect(result.current).toBe(0);
    expect(result.best).toBe(0);
    expect(result.week).toHaveLength(7);
    expect(result.week[6]?.today).toBe(true);
  });
});