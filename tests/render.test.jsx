// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import AttendanceTracker from "../src/attendance-tracker";
import { DAYS } from "../src/beltUtils";

// Firestore is stubbed out so these stay offline: the point is whether the
// components render, not what the network returns.
vi.mock("../src/firebase", () => ({ db: {}, auth: {}, googleProvider: {} }));
vi.mock("firebase/firestore", () => ({
  collection: () => ({}),
  doc: () => ({}),
  getDoc: async () => ({ exists: () => false }),
  getDocs: async () => ({ forEach: () => {} }),
  setDoc: async () => {},
}));

afterEach(cleanup);

/**
 * Renders the tracker and waits for both hooks to finish loading.
 *
 * A render-time throw propagates out of render() rather than being swallowed,
 * so simply getting through this without an exception is the assertion these
 * tests are built around.
 */
async function renderTracker() {
  render(<AttendanceTracker uid="test-uid" onSignOut={() => {}} />);
  await waitFor(() => expect(screen.queryByText("Loading…")).toBeNull());
}

describe("AttendanceTracker rendering", () => {
  it("renders the Tracker tab", async () => {
    await renderTracker();
    expect(screen.getByText("Weekly Log")).toBeTruthy();
  });

  it("renders the Planner tab", async () => {
    // Regression: the Planner called a style helper that had been converted to
    // a plain object, so opening this tab threw and blanked the page. The
    // Tracker was unaffected, which is exactly why it needs its own check.
    await renderTracker();
    fireEvent.click(screen.getByText("Planner"));
    expect(screen.getByText("Attendance Planner")).toBeTruthy();
  });

  it("survives switching back and forth between tabs", async () => {
    await renderTracker();
    fireEvent.click(screen.getByText("Planner"));
    fireEvent.click(screen.getByText("Tracker"));
    expect(screen.getByText("Weekly Log")).toBeTruthy();
    fireEvent.click(screen.getByText("Planner"));
    expect(screen.getByText("Attendance Planner")).toBeTruthy();
  });

  it("shows every day of the week, in order, on both tabs", async () => {
    await renderTracker();
    const headerRow = () =>
      Array.from(document.querySelectorAll("div"))
        .map((el) => Array.from(el.children).map((c) => c.textContent))
        .find((texts) => texts.includes("Week of") && texts.includes("Days"))
        .filter((t) => t !== "Week of" && t !== "Days");

    expect(headerRow()).toEqual(DAYS);
    fireEvent.click(screen.getByText("Planner"));
    expect(headerRow()).toEqual(DAYS);
  });
});
