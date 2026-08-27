import { describe, it, expect } from "vitest";
import {
  computeBELT,
  computeMinDaysNeeded,
  computeExpiringDrop,
  DAYS,
  emptyDays,
} from "../src/beltUtils";

// Helper: build a week object with a given number of days attended
function makeWeek(daysCount) {
  const days = emptyDays();
  for (let i = 0; i < daysCount; i++) days[DAYS[i]] = true;
  return { days };
}

// Helper: build a 12-week array with specific day counts
function makeWeeks(counts) {
  return counts.map(makeWeek);
}

describe("computeBELT", () => {
  it("returns null when fewer than 8 weeks are provided", () => {
    expect(computeBELT(makeWeeks([3, 3, 3, 3, 3, 3, 3]))).toBeNull();
  });

  it("returns null for an empty array", () => {
    expect(computeBELT([])).toBeNull();
  });

  it("computes correctly when exactly 8 weeks are provided", () => {
    // best 8 of 8: [4,4,4,4,4,4,4,4] → avg = 4
    expect(computeBELT(makeWeeks([4, 4, 4, 4, 4, 4, 4, 4]))).toBe(4);
  });

  it("uses the best 8 of 12 weeks (ignores the 4 lowest)", () => {
    // 8 weeks at 5, 4 weeks at 0 → best 8 avg = 5
    const weeks = makeWeeks([5, 5, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0]);
    expect(computeBELT(weeks)).toBe(5);
  });

  it("correctly ignores the 4 lowest with a mixed set", () => {
    // best 8: [5,5,5,5,4,4,4,4] = 36/8 = 4.5; lowest 4: [1,1,1,1]
    const weeks = makeWeeks([5, 5, 5, 5, 4, 4, 4, 4, 1, 1, 1, 1]);
    expect(computeBELT(weeks)).toBe(4.5);
  });

  it("returns 3.0 when all 12 weeks have exactly 3 days", () => {
    expect(computeBELT(makeWeeks([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]))).toBe(3);
  });

  it("returns 0 when all weeks have 0 days", () => {
    expect(computeBELT(makeWeeks([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(0);
  });

  it("returns 5 when all weeks have 5 days", () => {
    expect(computeBELT(makeWeeks([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]))).toBe(5);
  });

  it("returns 7 when all weeks are full 7-day weeks", () => {
    expect(computeBELT(makeWeeks([7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7]))).toBe(7);
  });

  it("counts weekend days toward the weekly total", () => {
    // A single week with only Sat and Sun badged still counts as 2 days
    const weekend = { days: { ...emptyDays(), Sat: true, Sun: true } };
    const weeks = [...makeWeeks([0, 0, 0, 0, 0, 0, 0]), weekend];
    expect(computeBELT(weeks)).toBe(0.25); // 2/8
  });

  it("returns exactly 3.0 at the compliance boundary", () => {
    // best 8: [4,4,4,4,2,2,2,2] = 24/8 = 3.0; lowest 4: [0,0,0,0]
    const weeks = makeWeeks([4, 4, 4, 4, 2, 2, 2, 2, 0, 0, 0, 0]);
    expect(computeBELT(weeks)).toBe(3);
  });

  it("returns just below 3.0 when nearly compliant", () => {
    // best 8: [3,3,3,3,3,3,3,2] = 23/8 = 2.875
    const weeks = makeWeeks([3, 3, 3, 3, 3, 3, 3, 2, 0, 0, 0, 0]);
    expect(computeBELT(weeks)).toBeCloseTo(2.875);
  });

  it("handles non-uniform best-8 selection correctly", () => {
    // sorted desc: [5,4,3,3,3,3,3,3, 2,1,0,0] → best 8 sum = 5+4+3*6 = 27 → 27/8 = 3.375
    const weeks = makeWeeks([0, 1, 2, 3, 3, 3, 3, 3, 3, 4, 5, 0]);
    expect(computeBELT(weeks)).toBeCloseTo(3.375);
  });
});

describe("computeMinDaysNeeded", () => {
  it("returns 0 when already at BELT >= 3 with 0 days this week", () => {
    // 11 weeks at 5 days → best 8 from those 11 alone give avg 5, even with 0 this week
    const weeks = makeWeeks([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 0]);
    expect(computeMinDaysNeeded(weeks)).toBe(0);
  });

  it("returns the correct count when some days are needed", () => {
    // with 3 days this week: best 8 = [3,3,3,3,3,3,3,3] = 3.0 ✓ → returns 3
    const weeks = makeWeeks([3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 0]);
    expect(computeMinDaysNeeded(weeks)).toBe(3);
  });

  it("returns 0 when already passing with 0 days this week", () => {
    // best 8 = [5,5,5,5,5,5,5,5] = 5.0 ✓ even with 0 this week
    const weeks = makeWeeks([5, 5, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0]);
    expect(computeMinDaysNeeded(weeks)).toBe(0);
  });

  it("returns 1 when only 1 day tips the window into compliance", () => {
    // With current=0: sorted top 8 = [4,4,3,3,3,3,3,0] = 23/8 = 2.875 — fails
    // With current=1: top 8 = [4,4,3,3,3,3,3,1] = 24/8 = 3.0 — passes
    const weeks = makeWeeks([4, 4, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0]);
    expect(computeMinDaysNeeded(weeks)).toBe(1);
  });

  it("can require a weekend day to reach the threshold", () => {
    // Top 7 of the prior weeks sum to 18, and the 8th slot is 0.
    // current=5 → best 8 = [5,3,3,3,3,2,2,2] = 23 → 2.875 ✗
    // current=6 → best 8 = [6,3,3,3,3,2,2,2] = 24 → 3.0 ✓
    const weeks = makeWeeks([3, 3, 3, 3, 2, 2, 2, 0, 0, 0, 0, 0]);
    expect(computeMinDaysNeeded(weeks)).toBe(6);
  });

  it("returns '7+' when even 7 days cannot reach BELT >= 3.0", () => {
    // All weeks at 0 → even with 7 days in current week:
    // best 8 = [7,0,0,0,0,0,0,0] = 7/8 = 0.875 — not enough
    const weeks = makeWeeks([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(computeMinDaysNeeded(weeks)).toBe("7+");
  });

  it("returns '7+' when history is too sparse to recover", () => {
    // 11 weeks at 1 day → with 7 this week: best 8 = [7,1,1,1,1,1,1,1] = 13/8 = 1.625 — fails
    const weeks = makeWeeks([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0]);
    expect(computeMinDaysNeeded(weeks)).toBe("7+");
  });
});

describe("computeExpiringDrop", () => {
  it("returns null when the window is too short to have a BELT", () => {
    expect(computeExpiringDrop(makeWeeks([3, 3, 3, 3, 3]))).toBeNull();
  });

  it("reports no drop when the expiring weeks are not holding the average up", () => {
    // The 4 oldest are the worst weeks; the best 8 survive untouched.
    const weeks = makeWeeks([0, 0, 0, 0, 4, 4, 4, 4, 4, 4, 4, 4]);
    expect(computeExpiringDrop(weeks).drop).toBe(0);
  });

  it("reports no drop when replacements tie the expiring weeks", () => {
    // Every week is a 3, so the 4 leaving are replaced by equals.
    // A naive 'is it in the best 8' check would flag all four here.
    const weeks = makeWeeks([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    const { current, after, drop } = computeExpiringDrop(weeks);
    expect(current).toBe(3);
    expect(after).toBe(3);
    expect(drop).toBe(0);
  });

  it("catches a loss that no single week is responsible for", () => {
    // Nine 3s: removing any one week alone changes nothing, because another 3
    // backfills the best 8. Losing all four together exhausts the backfills.
    const weeks = makeWeeks([3, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0]);
    const withoutOne = computeBELT(weeks.filter((_, i) => i !== 0));
    expect(withoutOne).toBe(3); // no individual loss
    // Survivors are five 3s and three 0s = 15/8 = 1.875, so 3.0 → 1.875.
    expect(computeExpiringDrop(weeks).drop).toBeCloseTo(1.125);
  });

  it("measures the drop when strong old weeks age out", () => {
    // best 8 of all 12 = [5,5,5,5,2,2,2,2] = 28/8 = 3.5
    // survivors alone   = [2,2,2,2,2,2,2,2] = 16/8 = 2.0
    const weeks = makeWeeks([5, 5, 5, 5, 2, 2, 2, 2, 2, 2, 2, 2]);
    const { current, after, drop } = computeExpiringDrop(weeks);
    expect(current).toBe(3.5);
    expect(after).toBe(2);
    expect(drop).toBeCloseTo(1.5);
  });

  it("never reports a negative drop", () => {
    // Recent weeks stronger than the expiring ones: best-8-of-12 already
    // ignores the old weeks, so the average cannot improve by losing them.
    const weeks = makeWeeks([1, 1, 1, 1, 5, 5, 5, 5, 5, 5, 5, 5]);
    expect(computeExpiringDrop(weeks).drop).toBe(0);
  });
});
