// ── Business-day / timezone helpers ─────────────────────────────────────────
// The shop runs in Pune. India Standard Time is a fixed UTC+5:30 with no DST,
// so we can offset instants directly instead of pulling in a tz library.
// A "business day" rolls over at the configured token-reset time (IST), so all
// token numbering and "today" analytics line up with the owner's actual day.

const IST_OFFSET_MIN = 330; // +5:30

function parseHHMM(t: string): number {
  const [h, m] = (t || "00:00").split(":").map((n) => parseInt(n, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/** IST business date "YYYY-MM-DD" for an instant; the day starts at `resetTime` (IST). */
export function businessDate(resetTime = "00:00", now: Date = new Date()): string {
  const resetMin = parseHHMM(resetTime);
  // Move into IST wall-clock, then back by the reset offset so the calendar date
  // of the shifted instant equals the business date.
  const shifted = new Date(now.getTime() + (IST_OFFSET_MIN - resetMin) * 60000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The real UTC instant at which the given IST business date begins (at resetTime IST). */
export function businessDayStart(dateStr: string, resetTime = "00:00"): Date {
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  const resetMin = parseHHMM(resetTime);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) + (resetMin - IST_OFFSET_MIN) * 60000);
}

/** Add `n` days to a "YYYY-MM-DD" string (plain calendar arithmetic). */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** IST hour (0-23) for an instant. */
export function istHour(d: Date): number {
  return new Date(d.getTime() + IST_OFFSET_MIN * 60000).getUTCHours();
}

/** Weekday short name ("Sun".."Sat") for a "YYYY-MM-DD" business date. */
export function weekdayName(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map((x) => parseInt(x, 10));
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return names[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
