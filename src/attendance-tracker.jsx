import { useState, useMemo } from "react";
import useAttendance from "./useAttendance";
import usePlanner from "./usePlanner";
import { computeBELT, computeMinDaysNeeded } from "./beltUtils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addWeeks(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

function weekId(monday) {
  return monday.toISOString().slice(0, 10);
}

function emptyDays() {
  return { Mon: false, Tue: false, Wed: false, Thu: false, Fri: false };
}

function formatWeekLabel(monday) {
  return monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateRange(start, end) {
  const opts = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

const TODAY = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const CURRENT_MONDAY = getMonday(TODAY);

export default function AttendanceTracker({ uid, onSignOut }) {
  const { weeks, toggleDay, loading } = useAttendance(uid);
  const [mode, setMode] = useState("tracker");
  const [simDays, setSimDays] = useState(3);
  const [simWeeks, setSimWeeks] = useState(4);
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

  const expiringAlert = weeks.slice(0, 4).filter((w, i) => weekCounts[i] >= 3);

  const minDaysNeeded = useMemo(() => computeMinDaysNeeded(weeks), [weeks]);

  const beltStatus = belt === null ? null : belt >= 3 ? "good" : "at-risk";

  // === PLANNER calculations ===
  // plannerOffset = how many weeks the window extends into the future
  // window spans: currentMonday-(11-plannerOffset) through currentMonday+plannerOffset
  const plannerWindow = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monday = addWeeks(CURRENT_MONDAY, i - (11 - plannerOffset));
      const wid = weekId(monday);
      const mondayTime = monday.getTime();
      const isPast = mondayTime < CURRENT_MONDAY.getTime();
      const isCurrent = mondayTime === CURRENT_MONDAY.getTime();
      const isFuture = mondayTime > CURRENT_MONDAY.getTime();

      const actualWeek = weeks.find((w) => w.id === wid);
      const actualDays = actualWeek ? { ...actualWeek.days } : emptyDays();

      let displayDays;
      if (isPast) {
        displayDays = actualDays;
      } else if (isCurrent) {
        // Merge: actual for past/today days, planned for future days of this week
        displayDays = { ...actualDays };
        DAYS.forEach((day, idx) => {
          const dayDate = new Date(monday);
          dayDate.setDate(monday.getDate() + idx);
          dayDate.setHours(0, 0, 0, 0);
          if (dayDate > TODAY) {
            displayDays[day] = plannerDays[wid]?.[day] ?? false;
          }
        });
      } else {
        displayDays = { ...emptyDays(), ...(plannerDays[wid] || {}) };
      }

      return { id: wid, monday, isPast, isCurrent, isFuture, days: displayDays };
    });
  }, [weeks, plannerOffset, plannerDays]);

  const plannerBELT = useMemo(() => computeBELT(plannerWindow), [plannerWindow]);

  if (loading || plannerLoading) {
    return (
      <div style={styles.loadingRoot}>
        <div style={styles.loadingText}>Loading attendance data…</div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>◈</div>
          <div>
            <h1 style={styles.title}>Attendance Tracker</h1>
            <p style={styles.subtitle}>12-week rolling window · BELT ≥ 3.0</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={styles.beltBadge(beltStatus)}>
            <div style={styles.beltLabel}>BELT AVG</div>
            <div style={styles.beltValue}>{belt !== null ? belt.toFixed(2) : "—"}</div>
            <div style={styles.beltStatusText(beltStatus)}>
              {beltStatus === "good"
                ? "✓ compliant"
                : beltStatus === "at-risk"
                ? "⚠ at risk"
                : "needs data"}
            </div>
          </div>
          <button onClick={onSignOut} style={styles.signOutBtn}>
            Sign out
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div style={styles.modeTabs}>
        <button
          onClick={() => setMode("tracker")}
          style={styles.modeTab(mode === "tracker")}
        >
          Tracker
        </button>
        <button
          onClick={() => setMode("planner")}
          style={styles.modeTab(mode === "planner")}
        >
          Planner
        </button>
      </div>

      {mode === "tracker" && (
        <>
          {beltStatus === "at-risk" && (
            <div style={styles.alertBar("red")}>
              ⚠ Your BELT average is below 3.0. You need at least{" "}
              <strong>
                {minDaysNeeded} day{minDaysNeeded !== 1 ? "s" : ""}
              </strong>{" "}
              this week to improve your standing.
            </div>
          )}
          {beltStatus === "good" && expiringAlert.length > 0 && (
            <div style={styles.alertBar("amber")}>
              ⏳ {expiringAlert.length} high-attendance week
              {expiringAlert.length > 1 ? "s" : ""} will roll out of your
              window soon — your cushion may shrink.
            </div>
          )}

          {/* Week grid */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Weekly Log</h2>
            <div style={styles.weekGrid}>
              <div style={styles.weekRowHeader}>
                <div style={styles.weekLabelHeader}>Week of</div>
                {DAYS.map((d) => (
                  <div key={d} style={styles.dayHeader}>
                    {d}
                  </div>
                ))}
                <div style={styles.countHeader}>Days</div>
              </div>
              {weeks.map((w, i) => {
                const count = weekCounts[i];
                const isCurrentWeek =
                  w.monday.toDateString() === CURRENT_MONDAY.toDateString();
                const isExpiring = i < 4;
                return (
                  <div key={w.id} style={styles.weekRow(isCurrentWeek, isExpiring)}>
                    <div style={styles.weekLabel}>
                      {formatWeekLabel(w.monday)}
                      {isCurrentWeek && <span style={styles.badge("blue")}>now</span>}
                      {isExpiring && !isCurrentWeek && (
                        <span style={styles.badge("gray")}>exp</span>
                      )}
                    </div>
                    {DAYS.map((day) => {
                      const dayDate = new Date(w.monday);
                      dayDate.setDate(dayDate.getDate() + DAYS.indexOf(day));
                      dayDate.setHours(0, 0, 0, 0);
                      const isFuture = dayDate > TODAY;
                      return (
                        <button
                          key={day}
                          onClick={() => !isFuture && toggleDay(w.id, day)}
                          style={styles.dayBtn(w.days[day], isFuture)}
                          title={isFuture ? "Future date" : day}
                        >
                          {w.days[day] ? "●" : isFuture ? "·" : "○"}
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
              <div style={styles.statValue}>{minDaysNeeded}</div>
              <div style={styles.statSub}>to maintain BELT ≥ 3.0</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Current week</div>
              <div style={styles.statValue}>{weekCounts[11]}</div>
              <div style={styles.statSub}>days logged so far</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Best 8 avg</div>
              <div style={styles.statValue}>
                {(
                  [...weekCounts]
                    .sort((a, b) => b - a)
                    .slice(0, 8)
                    .reduce((a, b) => a + b, 0) / 8 || 0
                ).toFixed(2)}
              </div>
              <div style={styles.statSub}>across 12 weeks</div>
            </div>
          </div>

          {/* Forward Simulator */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Forward Simulator</h2>
            <p style={styles.cardDesc}>
              What if you come in a consistent number of days per week for the
              next few weeks? See how it affects your BELT.
            </p>
            <div style={styles.simControls}>
              <div style={styles.simSlider}>
                <label style={styles.simLabel}>
                  Days/week: <strong>{simDays}</strong>
                </label>
                <input
                  type="range"
                  min={0}
                  max={5}
                  value={simDays}
                  onChange={(e) => setSimDays(+e.target.value)}
                  style={styles.slider}
                />
                <div style={styles.sliderTicks}>
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <span key={n}>{n}</span>
                  ))}
                </div>
              </div>
              <div style={styles.simSlider}>
                <label style={styles.simLabel}>
                  Weeks ahead: <strong>{simWeeks}</strong>
                </label>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={simWeeks}
                  onChange={(e) => setSimWeeks(+e.target.value)}
                  style={styles.slider}
                />
                <div style={styles.sliderTicks}>
                  {[1, 3, 6, 9, 12].map((n) => (
                    <span key={n}>{n}</span>
                  ))}
                </div>
              </div>
            </div>
            <div style={styles.simResult(simBELT !== null && simBELT >= 3)}>
              <span>Projected BELT: </span>
              <strong>{simBELT !== null ? simBELT.toFixed(2) : "—"}</strong>
              <span style={{ marginLeft: 12, opacity: 0.7 }}>
                {simBELT === null
                  ? ""
                  : simBELT >= 3
                  ? "✓ Would be compliant"
                  : "⚠ Would be below threshold"}
              </span>
            </div>
          </div>
        </>
      )}

      {mode === "planner" && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Attendance Planner</h2>
          <p style={styles.cardDesc}>
            Select a 12-week window and mark the days you plan to come in.
            Past weeks are pre-populated from your actual data. Future day
            slots are clickable — toggle them to build your plan and see the
            projected BELT.
          </p>

          {/* Window selector */}
          <div style={styles.plannerControls}>
            <label style={styles.plannerDropdownLabel}>
              Plan through week of:
            </label>
            <select
              value={plannerOffset}
              onChange={(e) => setPlannerOffset(+e.target.value)}
              style={styles.plannerSelect}
            >
              {Array.from({ length: 12 }, (_, offset) => {
                const endMonday = addWeeks(CURRENT_MONDAY, offset);
                const dateLabel = formatWeekLabel(endMonday);
                const futureLabel =
                  offset === 0
                    ? "no future weeks"
                    : offset === 1
                    ? "+1 future week"
                    : `+${offset} future weeks`;
                return (
                  <option key={offset} value={offset}>
                    {dateLabel} ({futureLabel})
                  </option>
                );
              })}
            </select>
            <button onClick={clearPlanner} style={styles.clearBtn}>
              Clear plan
            </button>
          </div>

          {/* Planner grid */}
          <div style={styles.weekGrid}>
            <div style={styles.weekRowHeader}>
              <div style={styles.weekLabelHeader}>Week of</div>
              {DAYS.map((d) => (
                <div key={d} style={styles.dayHeader}>
                  {d}
                </div>
              ))}
              <div style={styles.countHeader}>Days</div>
            </div>
            {plannerWindow.map((w) => {
              const count = Object.values(w.days).filter(Boolean).length;
              return (
                <div key={w.id} style={styles.weekRow(w.isCurrent, false)}>
                  <div style={styles.weekLabel}>
                    {formatWeekLabel(w.monday)}
                    {w.isCurrent && <span style={styles.badge("blue")}>now</span>}
                    {w.isPast && <span style={styles.badge("gray")}>actual</span>}
                    {w.isFuture && <span style={styles.badge("green")}>plan</span>}
                  </div>
                  {DAYS.map((day, idx) => {
                    const dayDate = new Date(w.monday);
                    dayDate.setDate(w.monday.getDate() + idx);
                    dayDate.setHours(0, 0, 0, 0);
                    const isFutureDay = dayDate > TODAY;
                    return (
                      <button
                        key={day}
                        onClick={() => isFutureDay && togglePlannerDay(w.id, day)}
                        style={styles.plannerDayBtn(w.days[day], !isFutureDay, isFutureDay)}
                        title={!isFutureDay ? `${day} (actual)` : `${day} (planned)`}
                      >
                        {w.days[day] ? "●" : isFutureDay ? "◻" : "○"}
                      </button>
                    );
                  })}
                  <div style={styles.countCell(count)}>{count}</div>
                </div>
              );
            })}
          </div>

          {/* Planner BELT result */}
          <div
            style={{
              marginTop: 16,
              ...styles.simResult(plannerBELT !== null && plannerBELT >= 3),
            }}
          >
            <span>Projected BELT for this window: </span>
            <strong>{plannerBELT !== null ? plannerBELT.toFixed(2) : "—"}</strong>
            <span style={{ marginLeft: 12, opacity: 0.7 }}>
              {plannerBELT === null
                ? ""
                : plannerBELT >= 3
                ? "✓ Compliant"
                : "⚠ Below threshold"}
            </span>
          </div>
        </div>
      )}

      <p style={styles.footer}>
        Data synced to the cloud — accessible from any device.
      </p>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#f8fafc",
    color: "#0f172a",
    fontFamily: "'DM Mono', 'Courier New', monospace",
    padding: "32px 24px",
    maxWidth: 860,
    margin: "0 auto",
  },
  loadingRoot: {
    minHeight: "100vh",
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#94a3b8",
    fontFamily: "'DM Mono', 'Courier New', monospace",
    fontSize: 14,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 16,
  },
  headerLeft: {
    display: "flex",
    gap: 14,
    alignItems: "center",
  },
  logo: {
    fontSize: 32,
    color: "#d97706",
    lineHeight: 1,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "0.04em",
    color: "#0f172a",
  },
  subtitle: {
    margin: "3px 0 0",
    fontSize: 11,
    letterSpacing: "0.06em",
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  beltBadge: (status) => ({
    textAlign: "center",
    background:
      status === "good"
        ? "#f0fdf4"
        : status === "at-risk"
        ? "#fef2f2"
        : "#f8fafc",
    border: `1px solid ${
      status === "good"
        ? "#bbf7d0"
        : status === "at-risk"
        ? "#fecaca"
        : "#e2e8f0"
    }`,
    borderRadius: 10,
    padding: "10px 18px",
    minWidth: 110,
  }),
  beltLabel: {
    fontSize: 9,
    letterSpacing: "0.12em",
    color: "#94a3b8",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  beltValue: {
    fontSize: 30,
    fontWeight: 700,
    color: "#d97706",
    lineHeight: 1,
  },
  beltStatusText: (status) => ({
    fontSize: 11,
    marginTop: 4,
    color:
      status === "good"
        ? "#16a34a"
        : status === "at-risk"
        ? "#dc2626"
        : "#94a3b8",
  }),
  modeTabs: {
    display: "flex",
    gap: 4,
    marginBottom: 16,
    background: "#f1f5f9",
    borderRadius: 8,
    padding: 4,
    width: "fit-content",
  },
  modeTab: (active) => ({
    padding: "6px 20px",
    borderRadius: 6,
    border: "none",
    background: active ? "#ffffff" : "transparent",
    color: active ? "#0f172a" : "#64748b",
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    fontFamily: "'DM Mono', 'Courier New', monospace",
    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
    transition: "all 0.15s",
  }),
  alertBar: (color) => ({
    background: color === "red" ? "#fef2f2" : "#fffbeb",
    border: `1px solid ${color === "red" ? "#fecaca" : "#fde68a"}`,
    borderRadius: 8,
    padding: "10px 16px",
    marginBottom: 16,
    fontSize: 13,
    color: color === "red" ? "#991b1b" : "#92400e",
    lineHeight: 1.5,
  }),
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "20px 24px",
    marginBottom: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  cardTitle: {
    margin: "0 0 10px",
    fontSize: 11,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#94a3b8",
    fontWeight: 500,
  },
  cardDesc: {
    margin: "0 0 16px",
    fontSize: 13,
    color: "#64748b",
    lineHeight: 1.6,
  },
  weekGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  weekRowHeader: {
    display: "grid",
    gridTemplateColumns: "90px repeat(5, 44px) 44px",
    gap: 4,
    paddingBottom: 8,
    borderBottom: "1px solid #f1f5f9",
    marginBottom: 4,
  },
  weekLabelHeader: {
    fontSize: 10,
    color: "#cbd5e1",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
  },
  dayHeader: {
    fontSize: 10,
    color: "#cbd5e1",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  countHeader: {
    fontSize: 10,
    color: "#cbd5e1",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  weekRow: (isCurrent, isExpiring) => ({
    display: "grid",
    gridTemplateColumns: "90px repeat(5, 44px) 44px",
    gap: 4,
    alignItems: "center",
    background: isCurrent ? "#f0f9ff" : "transparent",
    borderRadius: 6,
    padding: "2px 0",
    border: isCurrent ? "1px solid #bae6fd" : "1px solid transparent",
    opacity: isExpiring && !isCurrent ? 0.5 : 1,
  }),
  weekLabel: {
    fontSize: 12,
    color: "#374151",
    display: "flex",
    alignItems: "center",
    gap: 6,
    paddingLeft: 4,
  },
  badge: (color) => ({
    fontSize: 9,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    padding: "1px 5px",
    borderRadius: 3,
    background:
      color === "blue"
        ? "#eff6ff"
        : color === "green"
        ? "#f0fdf4"
        : "#f8fafc",
    color:
      color === "blue"
        ? "#3b82f6"
        : color === "green"
        ? "#16a34a"
        : "#94a3b8",
    border: `1px solid ${
      color === "blue"
        ? "#bfdbfe"
        : color === "green"
        ? "#bbf7d0"
        : "#e2e8f0"
    }`,
  }),
  dayBtn: (checked, isFuture) => ({
    width: 36,
    height: 28,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: checked ? "#f0fdf4" : "transparent",
    border: `1px ${isFuture && !checked ? "dashed" : "solid"} ${
      checked ? "#86efac" : "#e2e8f0"
    }`,
    borderRadius: 4,
    color: checked ? "#16a34a" : isFuture ? "#d1d5db" : "#cbd5e1",
    cursor: isFuture ? "default" : "pointer",
    fontSize: 12,
    transition: "all 0.1s",
  }),
  plannerDayBtn: (checked, isReadOnly, isFutureDay) => ({
    width: 36,
    height: 28,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: checked ? (isFutureDay ? "#eff6ff" : "#f0fdf4") : "transparent",
    border: `1px ${isReadOnly ? "solid" : "dashed"} ${
      checked
        ? isFutureDay
          ? "#bfdbfe"
          : "#86efac"
        : isFutureDay
        ? "#cbd5e1"
        : "#e2e8f0"
    }`,
    borderRadius: 4,
    color: checked
      ? isFutureDay
        ? "#3b82f6"
        : "#16a34a"
      : isReadOnly
      ? "#cbd5e1"
      : "#94a3b8",
    cursor: isReadOnly ? "default" : "pointer",
    fontSize: 12,
    transition: "all 0.1s",
  }),
  countCell: (count) => ({
    textAlign: "center",
    fontSize: 13,
    fontWeight: 700,
    color:
      count >= 3
        ? "#16a34a"
        : count === 2
        ? "#d97706"
        : count === 1
        ? "#ea580c"
        : "#cbd5e1",
  }),
  statsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "16px",
    textAlign: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#94a3b8",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    color: "#d97706",
    lineHeight: 1,
  },
  statSub: {
    fontSize: 11,
    color: "#94a3b8",
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
  },
  slider: {
    width: "100%",
    accentColor: "#d97706",
  },
  sliderTicks: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 10,
    color: "#cbd5e1",
    marginTop: 4,
  },
  simResult: (passing) => ({
    background: passing ? "#f0fdf4" : "#fef2f2",
    border: `1px solid ${passing ? "#bbf7d0" : "#fecaca"}`,
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 14,
    color: passing ? "#166534" : "#991b1b",
  }),
  plannerControls: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  plannerDropdownLabel: {
    fontSize: 13,
    color: "#374151",
    whiteSpace: "nowrap",
  },
  plannerSelect: {
    flex: 1,
    padding: "7px 10px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 13,
    fontFamily: "'DM Mono', 'Courier New', monospace",
    cursor: "pointer",
    outline: "none",
  },
  clearBtn: {
    background: "transparent",
    border: "1px solid #fecaca",
    borderRadius: 6,
    color: "#dc2626",
    fontSize: 12,
    padding: "6px 14px",
    cursor: "pointer",
    fontFamily: "'DM Mono', 'Courier New', monospace",
    whiteSpace: "nowrap",
  },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: "#cbd5e1",
    marginTop: 8,
    letterSpacing: "0.04em",
  },
  signOutBtn: {
    background: "transparent",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    color: "#94a3b8",
    fontSize: 11,
    padding: "6px 12px",
    cursor: "pointer",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
    fontFamily: "'DM Mono', 'Courier New', monospace",
  },
};
