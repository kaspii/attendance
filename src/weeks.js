// Week boundaries and identity. These are shared rather than duplicated
// because weekId doubles as the Firestore document key: if two copies of it
// ever drifted, one part of the app would read a week while another wrote a
// different one, splitting the same data across two documents.

/**
 * The Sunday that starts the week containing `date`, at local midnight.
 *
 * getDay() is already the offset from Sunday (0 = Sunday), so winding back by
 * it lands on the week's first day, and a Sunday stays where it is.
 */
export function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

/** The same weekday `n` weeks away; negative `n` goes back. */
export function addWeeks(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

/** Stable id for a week, and its Firestore document key. e.g. "2026-07-05" */
export function weekId(weekStart) {
  return weekStart.toISOString().slice(0, 10);
}

/** Short human label for a week, e.g. "Jul 5". */
export function formatWeekLabel(weekStart) {
  return weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
