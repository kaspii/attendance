import { useState, useMemo } from "react";
import useAttendance from "./useAttendance";
import usePlanner from "./usePlanner";
import {
  computeBELT,
  computeMinDaysNeeded,
  computeExpiringDrop,
  DAYS,
  EXPIRING_WEEKS,
  emptyDays,
} from "./beltUtils";
import { getWeekStart, addWeeks, weekId, formatWeekLabel } from "./weeks";

const F = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const LIME = "#D4F535";
const BLACK = "#111111";

const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const CURRENT_WEEK_START = getWeekStart(TODAY);

export default function AttendanceTracker({ uid, onSignOut }) {
  const { weeks, toggleDay, loading } = useAttendance(uid);
  const [mode, setMode] = useState("tracker");
  const [simDays, setSimDays] = useState(3);
  const [simWeeks, setSimWeeks] = useState(4);
  const [showExpiringInfo, setShowExpiringInfo] = useState(false);
  const {
    plannerOffset,
    plannerDays,
    setPlannerOffset,
    togglePlannerDay,
    clearPlanner,
    loading: plannerLoading,
  } = usePlanner(uid);

  // === TRACKER calculations ===
  const belt = useMemo(() => computeBELT(weeks), [weeks]);
  const weekCounts = useMemo(
    () => weeks.map((w) => Object.values(w.days).filter(Boolean).length),
    [weeks]
  );

  const simBELT = useMemo(() => {
    const simmed = weeks.map((w, i) => {
      if (i >= 12 - simWeeks) {
        const fakeDays = {};
        DAYS.forEach((d, di) => (fakeDays[d] = di < simDays));
        return { ...w, days: fakeDays };
      }
      return w;
    });
    return computeBELT(simmed);
  }, [weeks, simDays, simWeeks]);

  const expiring = useMemo(() => computeExpiringDrop(weeks), [weeks]);
  const minDaysNeeded = useMemo(() => computeMinDaysNeeded(weeks), [weeks]);
  const beltStatus = belt === null ? null : belt >= 3 ? "good" : "at-risk";

  // === PLANNER calculations ===
  const plannerWindow = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const weekStart = addWeeks(CURRENT_WEEK_START, i - (11 - plannerOffset));
      const wid = weekId(weekStart);
      const weekStartTime = weekStart.getTime();
      const isPast = weekStartTime < CURRENT_WEEK_START.getTime();
      const isCurrent = weekStartTime === CURRENT_WEEK_START.getTime();
      const isFuture = weekStartTime > CURRENT_WEEK_START.getTime();

      const actualWeek = weeks.find((w) => w.id === wid);
      const actualDays = actualWeek ? { ...actualWeek.days } : emptyDays();

      let displayDays;
      if (isPast) {
        displayDays = actualDays;
      } else if (isCurrent) {
        displayDays = { ...actualDays };
        DAYS.forEach((day, idx) => {
          const dayDate = new Date(weekStart);
          dayDate.setDate(weekStart.getDate() + idx);
          dayDate.setHours(0, 0, 0, 0);
          if (dayDate > TODAY) {
            displayDays[day] = plannerDays[wid]?.[day] ?? false;
          }
        });
      } else {
        displayDays = { ...emptyDays(), ...(plannerDays[wid] || {}) };
      }

      return { id: wid, weekStart, isPast, isCurrent, isFuture, days: displayDays };
    });
  }, [weeks, plannerOffset, plannerDays]);

  const plannerBELT = useMemo(() => computeBELT(plannerWindow), [plannerWindow]);

  if (loading || plannerLoading) {
    return (
      <div style={styles.loadingRoot}>
        <div style={styles.loadingText}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>◈</span>
          <div>
            <h1 style={styles.title}>Attendance Tracker</h1>
            <p style={styles.subtitle}>12-week rolling window · BELT ≥ 3.0</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.beltBadge(beltStatus)}>
            <div style={styles.beltLabel(beltStatus)}>BELT AVG</div>
            <div style={styles.beltValue}>{belt !== null ? belt.toFixed(2) : "—"}</div>
            <div style={styles.beltStatusText(beltStatus)}>
              {beltStatus === "good" ? "✓ compliant" : beltStatus === "at-risk" ? "⚠ at risk" : "—"}
            </div>
          </div>
          <button onClick={onSignOut} className="sign-out-btn" style={styles.signOutBtn}>
            Sign out
          </button>
        </div>
      </div>

      {/* Mode pill toggle */}
      <div style={styles.modeTabs}>
        <button
          onClick={() => setMode("tracker")}
          className={`mode-tab${mode === "tracker" ? " mode-tab-active" : ""}`}
          style={styles.modeTab(mode === "tracker")}
        >
          Tracker
        </button>
        <button
          onClick={() => setMode("planner")}
          className={`mode-tab${mode === "planner" ? " mode-tab-active" : ""}`}
          style={styles.modeTab(mode === "planner")}
        >
          Planner
        </button>
      </div>

      {mode === "tracker" && (
        <>
          {/* Alert bars */}
          {beltStatus === "at-risk" && (
            <div style={styles.alertBar("red")}>
              <strong>⚠ Below threshold.</strong> You need at least{" "}
              <strong>{minDaysNeeded} day{minDaysNeeded !== 1 ? "s" : ""}</strong> this week to improve your BELT.
            </div>
          )}
          {beltStatus === "good" && expiring !== null && expiring.drop > 0 && (
            <div style={styles.alertBar("amber")}>
              <strong>Heads up.</strong> Your {EXPIRING_WEEKS} oldest weeks roll out of the
              window over the next month. Without new days, your BELT falls from{" "}
              <strong>{expiring.current.toFixed(2)}</strong> to{" "}
              <strong>{expiring.after.toFixed(2)}</strong>
              {expiring.after < 3 && " — below the threshold"}.
              <button
                onClick={() => setShowExpiringInfo((v) => !v)}
                className="info-btn"
                style={styles.infoBtn}
                aria-expanded={showExpiringInfo}
                aria-label="What does this mean?"
              >
                <span style={styles.infoGlyph}>i</span>
              </button>
              {showExpiringInfo && (
                <div style={styles.alertDetail}>
                  Your BELT averages the <strong>best 8</strong> of the 12 weeks below. The{" "}
                  {EXPIRING_WEEKS} oldest are still counted, but they leave the window as new
                  weeks are added, starting with{" "}
                  <strong>{formatWeekLabel(weeks[0].weekStart)}</strong> next Sunday. An{" "}
                  <strong>amber edge</strong> marks the ones that will actually cost you when
                  they go — a departure is free when another week matches it, so an unmarked
                  week can leave without moving your average. Hover a row for its exact cost.
                </div>
              )}
            </div>
          )}

          {/* Weekly Log */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Weekly Log</h2>
            <div style={styles.weekGrid}>
              <div style={styles.weekRowHeader}>
                <div style={styles.weekLabelHeader}>Week of</div>
                {DAYS.map((d) => (
                  <div key={d} style={styles.dayHeader}>{d}</div>
                ))}
                <div style={styles.countHeader}>Days</div>
              </div>
              {weeks.map((w, i) => {
                const count = weekCounts[i];
                const isCurrentWeek = w.weekStart.getTime() === CURRENT_WEEK_START.getTime();
                const isLeaving = i < EXPIRING_WEEKS;
                const cost = isLeaving && expiring ? expiring.perWeek[i] : 0;
                const inWeeks = `${i + 1} week${i === 0 ? "" : "s"}`;
                return (
                  <div
                    key={w.id}
                    style={styles.weekRow(isCurrentWeek, cost > 0)}
                    title={
                      !isLeaving
                        ? undefined
                        : cost > 0
                          ? `Leaves the window in ${inWeeks} and takes ${cost.toFixed(2)} off your BELT.`
                          : `Leaves the window in ${inWeeks}, but costs nothing — another week matches it.`
                    }
                  >
                    <div style={styles.weekLabel}>
                      {formatWeekLabel(w.weekStart)}
                      {isCurrentWeek && <span style={styles.badge("blue")}>now</span>}
                    </div>
                    {DAYS.map((day) => {
                      const dayDate = new Date(w.weekStart);
                      dayDate.setDate(dayDate.getDate() + DAYS.indexOf(day));
                      dayDate.setHours(0, 0, 0, 0);
                      const isFuture = dayDate > TODAY;
                      const checked = w.days[day];
                      return (
                        <button
                          key={day}
                          onClick={() => !isFuture && toggleDay(w.id, day)}
                          className={`day-btn${checked ? " day-btn-checked" : ""}`}
                          style={styles.dayBtn(checked, isFuture)}
                          title={isFuture ? "Future date" : day}
                        >
                          {checked ? "●" : isFuture ? "·" : "○"}
                        </button>
                      );
                    })}
                    <div style={styles.countCell(count)}>{count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats row */}
          <div style={styles.statsRow}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Min days needed this week</div>
              <div style={styles.statValue(false)}>{minDaysNeeded}</div>
              <div style={styles.statSub}>to maintain BELT ≥ 3.0</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Current week</div>
              <div style={styles.statValue(false)}>{weekCounts[11]}</div>
              <div style={styles.statSub}>days logged so far</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Best 8 avg</div>
              <div style={styles.statValue(false)}>
                {(
                  [...weekCounts].sort((a, b) => b - a).slice(0, 8).reduce((a, b) => a + b, 0) / 8 || 0
                ).toFixed(2)}
              </div>
              <div style={styles.statSub}>across 12 weeks</div>
            </div>
          </div>

          {/* Forward Simulator */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Forward Simulator</h2>
            <p style={styles.cardDesc}>
              Simulate coming in a consistent number of days per week and see how it affects your BELT.
            </p>
            <div style={styles.simControls}>
              <div style={styles.simSlider}>
                <label style={styles.simLabel}>Days/week: <strong>{simDays}</strong></label>
                <input type="range" min={0} max={7} value={simDays}
                  onChange={(e) => setSimDays(+e.target.value)} style={styles.slider} />
                <div style={styles.sliderTicks}>
                  {[0,1,2,3,4,5,6,7].map((n) => <span key={n}>{n}</span>)}
                </div>
              </div>
              <div style={styles.simSlider}>
                <label style={styles.simLabel}>Weeks ahead: <strong>{simWeeks}</strong></label>
                <input type="range" min={1} max={12} value={simWeeks}
                  onChange={(e) => setSimWeeks(+e.target.value)} style={styles.slider} />
                <div style={styles.sliderTicks}>
                  {[1,3,6,9,12].map((n) => <span key={n}>{n}</span>)}
                </div>
              </div>
            </div>
            <div style={styles.simResult(simBELT !== null && simBELT >= 3)}>
              <span>Projected BELT: </span>
              <strong>{simBELT !== null ? simBELT.toFixed(2) : "—"}</strong>
              <span style={{ marginLeft: 10, opacity: 0.75 }}>
                {simBELT === null ? "" : simBELT >= 3 ? "✓ Would be compliant" : "⚠ Would be below threshold"}
              </span>
            </div>
          </div>
        </>
      )}

      {mode === "planner" && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Attendance Planner</h2>
          <p style={styles.cardDesc}>
            Select how far ahead you want to plan. Past weeks show your actual attendance.
            Click future day slots to mark days you plan to attend and see the projected BELT.
            Your plan is saved automatically.
          </p>

          {/* Window selector */}
          <div style={styles.plannerControls}>
            <div style={styles.plannerDropdownGroup}>
              <label style={styles.plannerDropdownLabel}>Window end date</label>
              <select
                value={plannerOffset}
                onChange={(e) => setPlannerOffset(+e.target.value)}
                style={styles.plannerSelect}
              >
                {Array.from({ length: 12 }, (_, offset) => {
                  const endWeekStart = addWeeks(CURRENT_WEEK_START, offset);
                  const dateLabel = formatWeekLabel(endWeekStart);
                  const futureLabel = offset === 0 ? "no future weeks"
                    : offset === 1 ? "+1 future week"
                    : `+${offset} future weeks`;
                  return (
                    <option key={offset} value={offset}>
                      Week of {dateLabel} ({futureLabel})
                    </option>
                  );
                })}
              </select>
            </div>
            <button onClick={clearPlanner} className="clear-btn" style={styles.clearBtn}>
              Clear plan
            </button>
          </div>

          {/* Planner grid */}
          <div style={styles.weekGrid}>
            <div style={styles.weekRowHeader}>
              <div style={styles.weekLabelHeader}>Week of</div>
              {DAYS.map((d) => <div key={d} style={styles.dayHeader}>{d}</div>)}
              <div style={styles.countHeader}>Days</div>
            </div>
            {plannerWindow.map((w) => {
              const count = Object.values(w.days).filter(Boolean).length;
              return (
                <div key={w.id} style={styles.weekRow(w.isCurrent, false)}>
                  <div style={styles.weekLabel}>
                    {formatWeekLabel(w.weekStart)}
                    {w.isCurrent && <span style={styles.badge("blue")}>now</span>}
                    {w.isPast && <span style={styles.badge("gray")}>actual</span>}
                    {w.isFuture && <span style={styles.badge("green")}>plan</span>}
                  </div>
                  {DAYS.map((day, idx) => {
                    const dayDate = new Date(w.weekStart);
                    dayDate.setDate(w.weekStart.getDate() + idx);
                    dayDate.setHours(0, 0, 0, 0);
                    const isFutureDay = dayDate > TODAY;
                    const checked = w.days[day];
                    const isPlanned = isFutureDay;
                    return (
                      <button
                        key={day}
                        onClick={() => isFutureDay && togglePlannerDay(w.id, day)}
                        className={`planner-day-btn${isPlanned && checked ? " planner-day-planned-checked" : ""}`}
                        style={styles.plannerDayBtn(checked, !isFutureDay, isFutureDay)}
                        title={!isFutureDay ? `${day} (actual)` : `${day} (planned)`}
                      >
                        {checked ? "●" : isFutureDay ? "◻" : "○"}
                      </button>
                    );
                  })}
                  <div style={styles.countCell(count)}>{count}</div>
                </div>
              );
            })}
          </div>

          {/* Planner result */}
          <div style={{ marginTop: 16, ...styles.simResult(plannerBELT !== null && plannerBELT >= 3) }}>
            <span>Projected BELT for this window: </span>
            <strong>{plannerBELT !== null ? plannerBELT.toFixed(2) : "—"}</strong>
            <span style={{ marginLeft: 10, opacity: 0.75 }}>
              {plannerBELT === null ? "" : plannerBELT >= 3 ? "✓ Compliant" : "⚠ Below threshold"}
            </span>
          </div>
        </div>
      )}

      <p style={styles.footer}>Data synced to the cloud — accessible from any device.</p>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#ffffff",
    color: "#111111",
    fontFamily: F,
    padding: "32px 24px",
    maxWidth: 880,
    margin: "0 auto",
  },
  loadingRoot: {
    minHeight: "100vh",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: F,
  },
  loadingText: {
    color: "#9ca3af",
    fontSize: 14,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 20,
    borderBottom: "1px solid #e5e7eb",
    gap: 16,
  },
  headerLeft: {
    display: "flex",
    gap: 12,
    alignItems: "center",
  },
  logo: {
    fontSize: 28,
    color: LIME,
    lineHeight: 1,
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#111111",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: "2px 0 0",
    fontSize: 12,
    color: "#9ca3af",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexShrink: 0,
  },
  beltBadge: (status) => ({
    textAlign: "center",
    background: status === "good" ? LIME : status === "at-risk" ? "#fce7f3" : "#f3f4f6",
    borderRadius: 10,
    padding: "10px 16px",
    minWidth: 100,
  }),
  beltLabel: (status) => ({
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: "0.12em",
    color: status === "good" ? "#3d6b00" : status === "at-risk" ? "#9d174d" : "#9ca3af",
    textTransform: "uppercase",
    marginBottom: 2,
  }),
  beltValue: {
    fontSize: 28,
    fontWeight: 800,
    color: "#111111",
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },
  beltStatusText: (status) => ({
    fontSize: 11,
    fontWeight: 500,
    marginTop: 3,
    color: status === "good" ? "#3d6b00" : status === "at-risk" ? "#9d174d" : "#9ca3af",
  }),
  modeTabs: {
    display: "inline-flex",
    background: "#f3f4f6",
    borderRadius: 100,
    padding: 4,
    gap: 2,
    marginBottom: 24,
  },
  modeTab: (active) => ({
    padding: "8px 22px",
    borderRadius: 100,
    border: "none",
    background: active ? "#ffffff" : "transparent",
    color: active ? "#111111" : "#6b7280",
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    fontFamily: F,
    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)" : "none",
    letterSpacing: "-0.01em",
  }),
  alertBar: (color) => ({
    background: color === "red" ? "#fff0f6" : "#fffbeb",
    borderLeft: `3px solid ${color === "red" ? "#f9a8d4" : "#fcd34d"}`,
    borderRadius: "0 8px 8px 0",
    padding: "12px 16px",
    marginBottom: 16,
    fontSize: 13,
    color: color === "red" ? "#9d174d" : "#92400e",
    lineHeight: 1.5,
  }),
  // 24x24 hit area (WCAG 2.5.8 minimum) wrapping a 16px circle, so the
  // control stays visually light without becoming hard to tap.
  infoBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    margin: "0 0 -7px 3px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: 0,
  },
  infoGlyph: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 16,
    height: 16,
    borderRadius: "50%",
    border: "1px solid #d9a441",
    color: "#92400e",
    fontFamily: F,
    fontSize: 10,
    fontWeight: 700,
    fontStyle: "italic",
    lineHeight: 1,
  },
  alertDetail: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px solid #fcd34d",
    fontSize: 12.5,
    lineHeight: 1.6,
    color: "#78350f",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "22px 24px",
    marginBottom: 16,
  },
  cardTitle: {
    margin: "0 0 8px",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#9ca3af",
  },
  cardDesc: {
    margin: "0 0 18px",
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 1.6,
  },
  weekGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
  },
  weekRowHeader: {
    display: "grid",
    gridTemplateColumns: "90px repeat(7, 42px) 42px",
    gap: 4,
    paddingBottom: 8,
    borderBottom: "1px solid #e5e7eb",
    marginBottom: 4,
  },
  weekLabelHeader: {
    fontSize: 10,
    fontWeight: 600,
    color: "#d1d5db",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
  },
  dayHeader: {
    fontSize: 10,
    fontWeight: 600,
    color: "#d1d5db",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  countHeader: {
    fontSize: 10,
    fontWeight: 600,
    color: "#d1d5db",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  weekRow: (isCurrent, isExpiring) => ({
    display: "grid",
    gridTemplateColumns: "90px repeat(7, 42px) 42px",
    gap: 4,
    alignItems: "center",
    background: isCurrent ? "#fafee8" : "transparent",
    borderRadius: 6,
    padding: "3px 0",
    border: `1px solid ${isCurrent ? "#e9f59a" : "transparent"}`,
    // Constant 3px left edge on every row so the amber marker cannot
    // shift the day columns out of alignment with the header.
    borderLeftWidth: 3,
    borderLeftStyle: "solid",
    borderLeftColor: isExpiring ? "#fcd34d" : isCurrent ? "#e9f59a" : "transparent",
  }),
  weekLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: "#374151",
    display: "flex",
    alignItems: "center",
    gap: 6,
    paddingLeft: 4,
  },
  badge: (color) => ({
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    padding: "2px 6px",
    borderRadius: 100,
    background: color === "blue" ? "#eff6ff" : color === "green" ? "#f0fdf4" : "#f3f4f6",
    color: color === "blue" ? "#3b82f6" : color === "green" ? "#16a34a" : "#9ca3af",
  }),
  dayBtn: (checked, isFuture) => ({
    width: 34,
    height: 28,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: checked ? BLACK : "transparent",
    border: `1.5px ${isFuture && !checked ? "dashed" : "solid"} ${checked ? BLACK : "#e5e7eb"}`,
    borderRadius: 5,
    cursor: isFuture ? "default" : "pointer",
    padding: 0,
    fontSize: 12,
    color: checked ? "#ffffff" : isFuture ? "#d1d5db" : "#9ca3af",
  }),
  plannerDayBtn: (checked, isReadOnly, isFutureDay) => ({
    width: 34,
    height: 28,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: checked
      ? isFutureDay ? "#2563eb" : BLACK
      : "transparent",
    border: `1.5px ${isReadOnly ? "solid" : "dashed"} ${
      checked
        ? isFutureDay ? "#2563eb" : BLACK
        : isFutureDay ? "#bfdbfe" : "#e5e7eb"
    }`,
    borderRadius: 5,
    cursor: isReadOnly ? "default" : "pointer",
    padding: 0,
    fontSize: 12,
    color: checked ? "#ffffff" : isFutureDay ? "#bfdbfe" : "#9ca3af",
  }),
  countCell: (count) => ({
    textAlign: "center",
    fontSize: 13,
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    color: count >= 3 ? "#16a34a" : count === 2 ? "#d97706" : count === 1 ? "#ea580c" : "#d1d5db",
  }),
  statsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "18px 16px",
    textAlign: "center",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#9ca3af",
    marginBottom: 8,
  },
  statValue: (_unused) => ({
    fontSize: 30,
    fontWeight: 800,
    color: "#111111",
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.02em",
  }),
  statSub: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 6,
  },
  simControls: {
    display: "flex",
    gap: 32,
    marginBottom: 20,
  },
  simSlider: {
    flex: 1,
  },
  simLabel: {
    fontSize: 13,
    color: "#374151",
    display: "block",
    marginBottom: 8,
    fontWeight: 400,
  },
  slider: {
    width: "100%",
    accentColor: BLACK,
  },
  sliderTicks: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 10,
    color: "#d1d5db",
    marginTop: 4,
  },
  simResult: (passing) => ({
    background: passing ? "#f7ffd4" : "#fff0f6",
    border: `1px solid ${passing ? "#d9f99d" : "#f9a8d4"}`,
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 14,
    color: passing ? "#3f6212" : "#9d174d",
    fontWeight: 500,
  }),
  plannerControls: {
    display: "flex",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 20,
  },
  plannerDropdownGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    flex: 1,
  },
  plannerDropdownLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#6b7280",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  plannerSelect: {
    padding: "9px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#111111",
    fontSize: 14,
    fontFamily: F,
    cursor: "pointer",
    outline: "none",
    width: "100%",
  },
  clearBtn: {
    background: "transparent",
    border: "1px solid #f9a8d4",
    borderRadius: 8,
    color: "#9d174d",
    fontSize: 13,
    fontWeight: 500,
    padding: "9px 16px",
    cursor: "pointer",
    fontFamily: F,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  footer: {
    textAlign: "center",
    fontSize: 12,
    color: "#d1d5db",
    marginTop: 8,
  },
  signOutBtn: {
    background: "#f3f4f6",
    border: "none",
    borderRadius: 8,
    color: "#6b7280",
    fontSize: 13,
    fontWeight: 500,
    padding: "8px 14px",
    cursor: "pointer",
    fontFamily: F,
  },
};
