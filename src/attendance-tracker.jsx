import { useState, useMemo } from "react";
import useAttendance from "./useAttendance";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(monday) {
  return monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function computeBELT(weeks) {
  // Best 8 of last 12
  const counts = weeks.map((w) => Object.values(w.days).filter(Boolean).length);
  const sorted = [...counts].sort((a, b) => b - a);
  const best8 = sorted.slice(0, 8);
  if (best8.length < 8) return null;
  return best8.reduce((a, b) => a + b, 0) / 8;
}

const TODAY = new Date();
const CURRENT_MONDAY = getMonday(TODAY);

export default function AttendanceTracker({ uid, onSignOut }) {
  const { weeks, toggleDay, loading } = useAttendance(uid);
  const [simDays, setSimDays] = useState(3);
  const [simWeeks, setSimWeeks] = useState(4);

  const belt = useMemo(() => computeBELT(weeks), [weeks]);

  const weekCounts = useMemo(
    () => weeks.map((w) => Object.values(w.days).filter(Boolean).length),
    [weeks]
  );

  // Simulate: replace future/current week(s) with simDays per week
  const simBELT = useMemo(() => {
    const simmed = weeks.map((w, i) => {
      const isInSimRange = i >= 12 - simWeeks;
      if (isInSimRange) {
        const fakeCount = simDays;
        const fakeDays = {};
        DAYS.forEach((d, di) => (fakeDays[d] = di < fakeCount));
        return { ...w, days: fakeDays };
      }
      return w;
    });
    return computeBELT(simmed);
  }, [weeks, simDays, simWeeks]);

  // Expiring weeks: the 4 oldest weeks (they fall off as new ones come in)
  const expiringWeeks = weeks.slice(0, 4);
  const expiringAlert = expiringWeeks.filter((w, i) => weekCounts[i] >= 3);

  // Min days needed this week to stay at BELT ≥ 3
  const minDaysNeeded = useMemo(() => {
    for (let target = 0; target <= 5; target++) {
      const testWeeks = weeks.map((w, i) => {
        if (i === weeks.length - 1) {
          const fakeDays = {};
          DAYS.forEach((d, di) => (fakeDays[d] = di < target));
          return { ...w, days: fakeDays };
        }
        return w;
      });
      const b = computeBELT(testWeeks);
      if (b !== null && b >= 3) return target;
    }
    return "5+";
  }, [weeks]);

  const beltStatus = belt === null ? null : belt >= 3 ? "good" : "at-risk";

  if (loading) {
    return (
      <div style={styles.root}>
        <div style={{ textAlign: "center", paddingTop: 120, color: "#888", fontSize: 14 }}>
          Loading attendance data…
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>◈</div>
          <div>
            <h1 style={styles.title}>ATTENDANCE TRACKER</h1>
            <p style={styles.subtitle}>12-week rolling window · BELT ≥ 3.0</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={styles.beltBadge(beltStatus)}>
          <div style={styles.beltLabel}>BELT AVG</div>
          <div style={styles.beltValue}>
            {belt !== null ? belt.toFixed(2) : "—"}
          </div>
          <div style={styles.beltStatus}>
            {beltStatus === "good" ? "✓ compliant" : beltStatus === "at-risk" ? "⚠ at risk" : "needs data"}
          </div>
        </div>
        <button onClick={onSignOut} style={styles.signOutBtn}>Sign out</button>
        </div>
      </div>

      {/* Alert bar */}
      {beltStatus === "at-risk" && (
        <div style={styles.alertBar("red")}>
          ⚠ Your BELT average is below 3.0. You need at least{" "}
          <strong>{minDaysNeeded} day{minDaysNeeded !== 1 ? "s" : ""}</strong>{" "}
          this week to improve your standing.
        </div>
      )}
      {beltStatus === "good" && expiringAlert.length > 0 && (
        <div style={styles.alertBar("amber")}>
          ⏳ {expiringAlert.length} high-attendance week{expiringAlert.length > 1 ? "s" : ""} will roll out of your window soon — your cushion may shrink.
        </div>
      )}

      {/* Week grid */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Weekly Log</h2>
        <div style={styles.weekGrid}>
          {/* Header row */}
          <div style={styles.weekRowHeader}>
            <div style={styles.weekLabelHeader}>Week of</div>
            {DAYS.map((d) => (
              <div key={d} style={styles.dayHeader}>{d}</div>
            ))}
            <div style={styles.countHeader}>Days</div>
          </div>
          {weeks.map((w, i) => {
            const count = weekCounts[i];
            const isCurrentWeek =
              w.monday.toDateString() === CURRENT_MONDAY.toDateString();
            const isExpiring = i < 4;
            return (
              <div
                key={w.id}
                style={styles.weekRow(isCurrentWeek, isExpiring)}
              >
                <div style={styles.weekLabel}>
                  {formatWeekLabel(w.monday)}
                  {isCurrentWeek && (
                    <span style={styles.badge("blue")}>now</span>
                  )}
                  {isExpiring && !isCurrentWeek && (
                    <span style={styles.badge("gray")}>exp</span>
                  )}
                </div>
                {DAYS.map((day) => {
                  // Only allow toggling days up to today
                  const dayDate = new Date(w.monday);
                  dayDate.setDate(dayDate.getDate() + DAYS.indexOf(day));
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
                <div style={styles.countCell(count)}>
                  {count}
                </div>
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
            {[...weekCounts].sort((a, b) => b - a).slice(0, 8).reduce((a, b) => a + b, 0) / 8 || 0}
          </div>
          <div style={styles.statSub}>across 12 weeks</div>
        </div>
      </div>

      {/* Simulator */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Forward Simulator</h2>
        <p style={styles.cardDesc}>
          What if you come in a consistent number of days per week for the next
          few weeks? See how it affects your BELT.
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
              {[0,1,2,3,4,5].map(n => <span key={n}>{n}</span>)}
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
              {[1,3,6,9,12].map(n => <span key={n}>{n}</span>)}
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

      <p style={styles.footer}>
        Data synced to the cloud — accessible from any device.
      </p>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0d0d0f",
    color: "#e8e4dc",
    fontFamily: "'DM Mono', 'Courier New', monospace",
    padding: "32px 24px",
    maxWidth: 860,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
    gap: 16,
  },
  headerLeft: {
    display: "flex",
    gap: 16,
    alignItems: "center",
  },
  logo: {
    fontSize: 36,
    color: "#c8b97a",
    lineHeight: 1,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#e8e4dc",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: 11,
    letterSpacing: "0.08em",
    color: "#888",
    textTransform: "uppercase",
  },
  beltBadge: (status) => ({
    textAlign: "center",
    background: status === "good" ? "#1a2e1a" : status === "at-risk" ? "#2e1a1a" : "#1a1a1a",
    border: `1px solid ${status === "good" ? "#3a6b3a" : status === "at-risk" ? "#6b3a3a" : "#333"}`,
    borderRadius: 8,
    padding: "12px 20px",
    minWidth: 110,
  }),
  beltLabel: {
    fontSize: 10,
    letterSpacing: "0.12em",
    color: "#888",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  beltValue: {
    fontSize: 32,
    fontWeight: 700,
    color: "#c8b97a",
    lineHeight: 1,
  },
  beltStatus: {
    fontSize: 11,
    marginTop: 4,
    color: "#aaa",
  },
  alertBar: (color) => ({
    background: color === "red" ? "#2e1a1a" : "#2a2410",
    border: `1px solid ${color === "red" ? "#7a3030" : "#7a6020"}`,
    borderRadius: 6,
    padding: "10px 16px",
    marginBottom: 20,
    fontSize: 13,
    color: color === "red" ? "#f0a0a0" : "#e0c870",
    lineHeight: 1.5,
  }),
  card: {
    background: "#141416",
    border: "1px solid #2a2a2e",
    borderRadius: 10,
    padding: "20px 24px",
    marginBottom: 16,
  },
  cardTitle: {
    margin: "0 0 12px",
    fontSize: 13,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#c8b97a",
  },
  cardDesc: {
    margin: "0 0 16px",
    fontSize: 13,
    color: "#888",
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
    borderBottom: "1px solid #2a2a2e",
    marginBottom: 4,
  },
  weekLabelHeader: {
    fontSize: 10,
    color: "#555",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
  },
  dayHeader: {
    fontSize: 10,
    color: "#555",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  countHeader: {
    fontSize: 10,
    color: "#555",
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
    background: isCurrent ? "#1a1a20" : "transparent",
    borderRadius: 6,
    padding: "2px 0",
    border: isCurrent ? "1px solid #3a3a50" : "1px solid transparent",
    opacity: isExpiring && !isCurrent ? 0.6 : 1,
  }),
  weekLabel: {
    fontSize: 12,
    color: "#aaa",
    display: "flex",
    alignItems: "center",
    gap: 6,
    paddingLeft: 4,
  },
  badge: (color) => ({
    fontSize: 9,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "1px 5px",
    borderRadius: 3,
    background: color === "blue" ? "#1a2a3a" : "#222",
    color: color === "blue" ? "#6ab0e0" : "#666",
    border: `1px solid ${color === "blue" ? "#2a4a6a" : "#333"}`,
  }),
  dayBtn: (checked, isFuture) => ({
    width: 36,
    height: 28,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: checked ? "#1a3a1a" : "transparent",
    border: `1px solid ${checked ? "#3a7a3a" : "#2a2a2e"}`,
    borderRadius: 4,
    color: checked ? "#7adb7a" : isFuture ? "#333" : "#555",
    cursor: isFuture ? "default" : "pointer",
    fontSize: 14,
    transition: "all 0.1s",
  }),
  countCell: (count) => ({
    textAlign: "center",
    fontSize: 13,
    fontWeight: 700,
    color: count >= 3 ? "#7adb7a" : count === 2 ? "#e0c870" : count === 1 ? "#f0a060" : "#555",
  }),
  statsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    background: "#141416",
    border: "1px solid #2a2a2e",
    borderRadius: 10,
    padding: "16px",
    textAlign: "center",
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#666",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    color: "#c8b97a",
    lineHeight: 1,
  },
  statSub: {
    fontSize: 11,
    color: "#555",
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
    color: "#aaa",
    display: "block",
    marginBottom: 8,
  },
  slider: {
    width: "100%",
    accentColor: "#c8b97a",
  },
  sliderTicks: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 10,
    color: "#555",
    marginTop: 4,
  },
  simResult: (passing) => ({
    background: passing ? "#1a2e1a" : "#2e1a1a",
    border: `1px solid ${passing ? "#3a6b3a" : "#6b3a3a"}`,
    borderRadius: 6,
    padding: "12px 16px",
    fontSize: 15,
    color: passing ? "#a0e0a0" : "#e0a0a0",
  }),
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: "#444",
    marginTop: 8,
    letterSpacing: "0.06em",
  },
  signOutBtn: {
    background: "transparent",
    border: "1px solid #333",
    borderRadius: 6,
    color: "#666",
    fontSize: 11,
    padding: "6px 12px",
    cursor: "pointer",
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
  },
};
