import { describe, it, expect } from "vitest";
import { remapWeeks, planMigration, countAttended, parseWeekId } from "../src/migrateWeekKeys";
import { getWeekStart, weekId } from "../src/weeks";
import { DAYS } from "../src/beltUtils";

// Jul 6 2026 is a Monday, so its old week ran Mon Jul 6 - Sun Jul 12.
const MONDAY = "2026-07-06";

describe("parseWeekId", () => {
  it("reads the id as a local date", () => {
    const d = parseWeekId("2026-07-06");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 6, 6]);
  });

  it("round-trips through the app's own week id", () => {
    expect(weekId(getWeekStart(parseWeekId("2026-07-05")))).toBe("2026-07-05");
  });
});

describe("remapWeeks", () => {
  it("moves weekdays back to the week starting the day before", () => {
    const out = remapWeeks({ [MONDAY]: { Mon: true, Wed: true, Fri: true } });
    expect(Object.keys(out)).toEqual(["2026-07-05"]);
    expect(DAYS.filter((d) => out["2026-07-05"][d])).toEqual(["Mon", "Wed", "Fri"]);
  });

  it("keeps Saturday in that same week", () => {
    // Sat Jul 11 is the last day of both the old and the new week.
    const out = remapWeeks({ [MONDAY]: { Sat: true } });
    expect(Object.keys(out)).toEqual(["2026-07-05"]);
    expect(out["2026-07-05"].Sat).toBe(true);
  });

  it("moves Sunday forward to open the next week", () => {
    // Sun Jul 12 ended the old week but starts the new one, so it is the only
    // day that changes which week it belongs to.
    const out = remapWeeks({ [MONDAY]: { Sun: true } });
    expect(Object.keys(out)).toEqual(["2026-07-12"]);
    expect(out["2026-07-12"].Sun).toBe(true);
  });

  it("splits a full old week across the two weeks that now contain it", () => {
    const full = Object.fromEntries(
      ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => [d, true])
    );
    const out = remapWeeks({ [MONDAY]: full });
    expect(Object.keys(out).sort()).toEqual(["2026-07-05", "2026-07-12"]);
    expect(DAYS.filter((d) => out["2026-07-05"][d])).toEqual([
      "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
    ]);
    expect(DAYS.filter((d) => out["2026-07-12"][d])).toEqual(["Sun"]);
  });

  it("merges consecutive old weeks into the right shared week", () => {
    // The Sunday ending one old week and the weekdays of the next both belong
    // to the same new week, and must land in one record rather than clobber.
    const out = remapWeeks({
      "2026-07-06": { Sun: true }, // Sun Jul 12
      "2026-07-13": { Mon: true }, // Mon Jul 13
    });
    expect(Object.keys(out)).toEqual(["2026-07-12"]);
    expect(DAYS.filter((d) => out["2026-07-12"][d])).toEqual(["Sun", "Mon"]);
  });

  it("drops days that were never attended", () => {
    const out = remapWeeks({ [MONDAY]: { Mon: true, Tue: false, Wed: false } });
    expect(countAttended(out)).toBe(1);
  });

  it("ignores unrecognised day keys", () => {
    const out = remapWeeks({ [MONDAY]: { Mon: true, Funday: true } });
    expect(countAttended(out)).toBe(1);
  });

  it("handles an empty or absent day map", () => {
    expect(remapWeeks({ [MONDAY]: {} })).toEqual({});
    expect(remapWeeks({ [MONDAY]: undefined })).toEqual({});
    expect(remapWeeks({})).toEqual({});
  });

  it("lands every migrated day on the calendar date it started on", () => {
    // The property that matters: a day means a specific date, and the shift
    // must not move it. Checked across a run of weeks and every weekday.
    const oldWeeks = {};
    for (let w = 0; w < 8; w++) {
      const monday = new Date(2026, 5, 1 + w * 7); // Mon Jun 1 2026 onward
      oldWeeks[weekId(monday)] = Object.fromEntries(
        ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => [d, true])
      );
    }

    const datesOf = (weeks, dayOrder, startOffset) =>
      Object.entries(weeks)
        .flatMap(([id, days]) =>
          dayOrder
            .map((name, i) => {
              if (!days[name]) return null;
              const d = parseWeekId(id);
              d.setDate(d.getDate() + i + startOffset);
              return d.getTime();
            })
            .filter(Boolean)
        )
        .sort();

    const oldDates = datesOf(oldWeeks, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], 0);
    const newDates = datesOf(remapWeeks(oldWeeks), DAYS, 0);
    expect(newDates).toEqual(oldDates);
  });
});

describe("planMigration", () => {
  it("balances the day totals", () => {
    const plan = planMigration({
      "2026-07-06": { Mon: true, Wed: true, Sun: true },
      "2026-07-13": { Tue: true, Thu: true },
    });
    expect(plan.before).toBe(5);
    expect(plan.after).toBe(5);
    expect(plan.balanced).toBe(true);
  });

  it("reports the weeks on each side", () => {
    const plan = planMigration({ "2026-07-06": { Mon: true, Sun: true } });
    expect(plan.sourceWeeks).toBe(1);
    expect(plan.targetWeeks).toBe(2); // the Sunday opens a second week
  });

  it("lists the resulting weeks in date order", () => {
    const plan = planMigration({
      "2026-07-13": { Mon: true },
      "2026-07-06": { Mon: true },
    });
    expect(plan.rows.map((r) => r.id)).toEqual(["2026-07-05", "2026-07-12"]);
  });

  it("stays balanced over a realistic stretch of history", () => {
    const oldWeeks = {};
    for (let w = 0; w < 26; w++) {
      const monday = new Date(2026, 1, 2 + w * 7);
      const days = {};
      ["Mon", "Tue", "Wed", "Thu", "Fri"].forEach((d, i) => {
        if ((w + i) % 3 !== 0) days[d] = true;
      });
      oldWeeks[weekId(monday)] = days;
    }
    const plan = planMigration(oldWeeks);
    expect(plan.balanced).toBe(true);
    expect(plan.before).toBeGreaterThan(0);
  });
});
