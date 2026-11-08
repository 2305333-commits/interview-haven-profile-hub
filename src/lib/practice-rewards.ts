export type PracticeEvent = { topic: string; at: string };
type PracticeRating = { topic: string; attempts: number; updated_at: string; history: unknown };

/** Rating history timestamps are saved at grading, not question generation. */
export function ratingEvents(ratings: PracticeRating[]): PracticeEvent[] {
  return ratings.flatMap((rating) => {
    if (rating.attempts < 1) return [];
    const history = Array.isArray(rating.history) ? rating.history : [];
    const events = history.flatMap((entry: unknown) => {
      if (!entry || typeof entry !== "object" || !("t" in entry) || typeof entry.t !== "string") return [];
      return [{ topic: rating.topic, at: entry.t }];
    });
    return events.length ? events : [{ topic: rating.topic, at: rating.updated_at }];
  });
}

function topicName(topic: string) {
  return topic.replace(/^Coding:\s*/i, "").trim().replace(/\s+/g, " ");
}

export function topicBadges(events: PracticeEvent[]) {
  const badges = new Map<string, { topic: string; earnedAt: string }>();
  for (const event of events) {
    const topic = topicName(event.topic);
    if (!topic || !Number.isFinite(Date.parse(event.at))) continue;
    const key = topic.toLowerCase();
    const existing = badges.get(key);
    if (!existing || Date.parse(event.at) < Date.parse(existing.earnedAt)) {
      badges.set(key, { topic, earnedAt: event.at });
    }
  }
  return [...badges.values()].sort((a, b) => a.topic.localeCompare(b.topic));
}

/** Local calendar days mapped to stable ordinals, including across DST changes. */
function dayNumber(date: Date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

export function dailyStreak(events: PracticeEvent[], now = new Date()) {
  const today = dayNumber(now);
  const days = new Set(events.flatMap(({ at }) => {
    const date = new Date(at);
    if (!Number.isFinite(date.getTime()) || date.getTime() > now.getTime()) return [];
    return [dayNumber(date)];
  }));
  let current = 0;
  for (let day = days.has(today) ? today : today - 1; days.has(day); day--) current++;
  let best = 0;
  let run = 0;
  let previous: number | undefined;
  for (const day of [...days].sort((a, b) => a - b)) {
    run = previous !== undefined && day === previous + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  const week = Array.from({ length: 7 }, (_, index) => {
    const day = today - 6 + index;
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 + index);
    return { date, practiced: days.has(day), today: day === today };
  });
  return { current, best, practicedToday: days.has(today), week };
}