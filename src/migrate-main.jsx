// Dev-only page for the one-time Monday -> Sunday week key migration.
//
// Not part of the built site: Vite's production build only takes index.html as
// an entry, so this is reachable at /migrate.html under `npm run dev` and
// nowhere else. Delete it, src/migrate-main.jsx and src/migrateWeekKeys.js
// once the migration has been run.
//
// It is deliberately additive. New Sunday-keyed documents are written and the
// original Monday-keyed ones are left exactly as they are, so the migration
// can be re-run and nothing needs undoing if it goes wrong.

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase";
import { planMigration } from "./migrateWeekKeys";

const F = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function Migrate() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [existing, setExisting] = useState(null);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setAuthReady(true); }), []);

  // Read-only: loads what is there and works out what would change.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "users", user.uid, "weeks"));
        const old = {};
        snap.forEach((d) => { old[d.id] = d.data().days || {}; });
        setExisting(old);
        setPlan(planMigration(old));
      } catch (e) {
        setError(String(e));
      }
    })();
  }, [user]);

  async function apply() {
    setApplying(true);
    setError(null);
    try {
      const written = [];
      for (const [id, days] of Object.entries(plan.migrated)) {
        await setDoc(doc(db, "users", user.uid, "weeks", id), { days });
        written.push(id);
      }
      setResult({ written });
    } catch (e) {
      setError(String(e));
    }
    setApplying(false);
  }

  if (!authReady) return <p style={s.muted}>Checking sign-in…</p>;

  if (!user) {
    return (
      <div style={s.page}>
        <h1 style={s.h1}>Week key migration</h1>
        <p style={s.p}>Sign in as the account that owns the data.</p>
        <button style={s.primary} onClick={() => signInWithPopup(auth, googleProvider).catch((e) => setError(String(e)))}>
          Sign in with Google
        </button>
        {error && <pre style={s.error}>{error}</pre>}
      </div>
    );
  }

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Week key migration</h1>
      <p style={s.p}>
        Signed in as <strong>{user.email}</strong>
      </p>

      {error && <pre style={s.error}>{error}</pre>}
      {!plan && !error && <p style={s.muted}>Reading existing weeks…</p>}

      {plan && (
        <>
          <div style={s.card}>
            <h2 style={s.h2}>Dry run — nothing has been written</h2>
            <table style={s.summary}>
              <tbody>
                <tr><td style={s.k}>Existing (Monday-keyed) weeks</td><td style={s.v}>{plan.sourceWeeks}</td></tr>
                <tr><td style={s.k}>Weeks that would be written</td><td style={s.v}>{plan.targetWeeks}</td></tr>
                <tr><td style={s.k}>Attended days before</td><td style={s.v}>{plan.before}</td></tr>
                <tr><td style={s.k}>Attended days after</td><td style={s.v}>{plan.after}</td></tr>
                <tr>
                  <td style={s.k}>Totals balance</td>
                  <td style={{ ...s.v, color: plan.balanced ? "#15803d" : "#b91c1c" }}>
                    {plan.balanced ? "yes — no day gained or lost" : "NO — do not apply"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {plan.before === 0 && (
            <p style={s.note}>
              No attended days found, so there is nothing to migrate.
            </p>
          )}

          <div style={s.card}>
            <h2 style={s.h2}>Weeks that would be written</h2>
            <table style={s.table}>
              <thead>
                <tr><th style={s.th}>New week id</th><th style={s.th}>Days</th></tr>
              </thead>
              <tbody>
                {plan.rows.map((r) => (
                  <tr key={r.id}>
                    <td style={s.td}><code>{r.id}</code></td>
                    <td style={s.td}>{r.days.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={s.card}>
            <h2 style={s.h2}>Existing documents (left untouched)</h2>
            <table style={s.table}>
              <thead>
                <tr><th style={s.th}>Current week id</th><th style={s.th}>Days</th></tr>
              </thead>
              <tbody>
                {Object.entries(existing).sort(([a], [b]) => a.localeCompare(b)).map(([id, days]) => (
                  <tr key={id}>
                    <td style={s.td}><code>{id}</code></td>
                    <td style={s.td}>
                      {Object.entries(days).filter(([, v]) => v).map(([d]) => d).join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!result && (
            <button
              style={plan.balanced && plan.before > 0 ? s.primary : s.disabled}
              disabled={!plan.balanced || plan.before === 0 || applying}
              onClick={apply}
            >
              {applying ? "Writing…" : `Apply — write ${plan.targetWeeks} week documents`}
            </button>
          )}

          {result && (
            <div style={s.done}>
              <strong>Done.</strong> Wrote {result.written.length} documents. The original
              Monday-keyed documents were not modified or deleted.
            </div>
          )}
        </>
      )}
    </div>
  );
}

const s = {
  page: { fontFamily: F, maxWidth: 720, margin: "0 auto", padding: "40px 24px", color: "#111" },
  h1: { fontSize: 20, marginBottom: 6 },
  h2: { fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", marginBottom: 10 },
  p: { fontSize: 14, color: "#374151", marginBottom: 18 },
  muted: { fontFamily: F, fontSize: 14, color: "#6b7280", padding: 24 },
  note: { fontSize: 13, color: "#92400e", background: "#fffbeb", padding: "10px 14px", borderRadius: 8, marginBottom: 16 },
  card: { border: "1px solid #e5e7eb", borderRadius: 10, padding: 18, marginBottom: 16 },
  summary: { width: "100%", fontSize: 14, borderCollapse: "collapse" },
  k: { padding: "4px 0", color: "#6b7280" },
  v: { padding: "4px 0", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" },
  table: { width: "100%", fontSize: 13, borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb", color: "#6b7280", fontWeight: 600 },
  td: { padding: "6px 8px", borderBottom: "1px solid #f3f4f6" },
  primary: { background: "#111", color: "#fff", border: "none", borderRadius: 8, padding: "11px 18px", fontSize: 14, fontFamily: F, cursor: "pointer", fontWeight: 500 },
  disabled: { background: "#e5e7eb", color: "#9ca3af", border: "none", borderRadius: 8, padding: "11px 18px", fontSize: 14, fontFamily: F, cursor: "not-allowed", fontWeight: 500 },
  error: { background: "#fef2f2", color: "#b91c1c", padding: 12, borderRadius: 8, fontSize: 12, whiteSpace: "pre-wrap", marginBottom: 16 },
  done: { background: "#f0fdf4", color: "#166534", padding: "12px 16px", borderRadius: 8, fontSize: 14 },
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Migrate />
  </React.StrictMode>
);
