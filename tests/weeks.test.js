import { describe, it, expect } from "vitest";
import { getWeekStart, addWeeks, weekId, formatWeekLabel } from "../src/weeks";
import { DAYS } from "../src/beltUtils";

// Local-time construction throughout: getWeekStart works in local days, and
// building these from an ISO string would parse as UTC and shift the date in
// any timezone behind Greenwich.
const at = (y, m, d) => new Date(y, m - 1, d);

describe("getWeekStart", () => {
  it("winds back to Sunday from midweek", () => {
    // Mon Jul 6 2026 belongs to the week starting Sun Jul 5.
    expect(getWeekStart(at(2026, 7, 6)).getDate()).toBe(5);
  });

  it("leaves a Sunday where it is", () => {
    const sunday = at(2026, 7, 5);
    expect(getWeekStart(sunday).getTime()).toBe(sunday.getTime());
  });

  it("keeps Saturday in the week that started six days earlier", () => {
    // Sat Jul 11 is the last day of the Jul 5 week, not the start of a new one.
    expect(getWeekStart(at(2026, 7, 11)).getDate()).toBe(5);
  });

  it("groups a whole Sunday-to-Saturday run into one week", () => {
    const starts = Array.from({ length: 7 }, (_, i) =>
      getWeekStart(at(2026, 7, 5 + i)).getTime()
    );
    expect(new Set(starts).size).toBe(1);
  });

  it("puts the next Sunday in a new week", () => {
    expect(getWeekStart(at(2026, 7, 12)).getDate()).toBe(12);
  });

  it("crosses a month boundary", () => {
    // Wed Jul 1 2026 belongs to the week starting Sun Jun 28.
    const start = getWeekStart(at(2026, 7, 1));
    expect(start.getMonth()).toBe(5); // June
    expect(start.getDate()).toBe(28);
  });

  it("always lands on a Sunday, whatever the input day", () => {
    for (let d = 1; d <= 31; d++) {
      expect(getWeekStart(at(2026, 3, d)).getDay()).toBe(0);
    }
  });

  it("normalises to midnight so week starts compare by equality", () => {
    const start = getWeekStart(new Date(2026, 6, 8, 17, 43, 12, 500));
    expect([start.getHours(), start.getMinutes(), start.getSeconds()]).toEqual([0, 0, 0]);
  });
});

describe("DAYS ordering", () => {
  it("runs Sunday through Saturday", () => {
    expect(DAYS).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  });

  it("lines each column up with its real calendar day", () => {
    // The grids render day N by adding N to the week start, so the order has
    // to match what the calendar actually does from a Sunday.
    const start = getWeekStart(at(2026, 7, 8));
    DAYS.forEach((_, i) => {
      const dayDate = new Date(start);
      dayDate.setDate(start.getDate() + i);
      expect(dayDate.getDay()).toBe(i);
    });
  });
});

describe("addWeeks", () => {
  it("moves forward a week", () => {
    expect(addWeeks(at(2026, 7, 5), 1).getDate()).toBe(12);
  });

  it("moves back across a month boundary", () => {
    const back = addWeeks(at(2026, 7, 5), -2);
    expect(back.getMonth()).toBe(5); // June
    expect(back.getDate()).toBe(21);
  });

  it("stays on the same weekday", () => {
    for (const n of [-9, -1, 0, 3, 12]) {
      expect(addWeeks(at(2026, 7, 5), n).getDay()).toBe(0);
    }
  });

  it("does not mutate its input", () => {
    const original = at(2026, 7, 5);
    addWeeks(original, 4);
    expect(original.getDate()).toBe(5);
  });
});

describe("weekId", () => {
  it("is stable for every day within one week", () => {
    const ids = Array.from({ length: 7 }, (_, i) =>
      weekId(getWeekStart(at(2026, 7, 5 + i)))
    );
    expect(new Set(ids).size).toBe(1);
  });

  it("differs between adjacent weeks", () => {
    expect(weekId(getWeekStart(at(2026, 7, 5)))).not.toBe(
      weekId(getWeekStart(at(2026, 7, 12)))
    );
  });
});

describe("formatWeekLabel", () => {
  it("shows the Sunday that starts the week", () => {
    // The label a Monday-started week would have shown as "Jul 6".
    expect(formatWeekLabel(getWeekStart(at(2026, 7, 6)))).toBe("Jul 5");
  });
});
