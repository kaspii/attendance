import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from './firebase'

export default function SignIn({ denied }) {
  const handleSignIn = () => {
    signInWithPopup(auth, googleProvider)
  }

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.logo}>◈</div>
        <h1 style={styles.title}>Attendance Tracker</h1>
        <p style={styles.subtitle}>12-week rolling window · BELT ≥ 3.0</p>
        {denied && (
          <p style={styles.denied}>Access denied — this account is not authorized.</p>
        )}
        <button onClick={handleSignIn} style={styles.button}>
          Sign in with Google
        </button>
      </div>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DM Mono', 'Courier New', monospace",
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: '48px 40px',
    textAlign: 'center',
    maxWidth: 360,
    width: '100%',
    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
  },
  logo: {
    fontSize: 48,
    color: '#d97706',
    marginBottom: 16,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: '#0f172a',
  },
  subtitle: {
    margin: '8px 0 32px',
    fontSize: 11,
    letterSpacing: '0.08em',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  denied: {
    color: '#991b1b',
    fontSize: 12,
    margin: '0 0 20px',
    padding: '10px 16px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
  },
  button: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    color: '#374151',
    fontSize: 14,
    padding: '12px 24px',
    cursor: 'pointer',
    letterSpacing: '0.02em',
    fontFamily: "'DM Mono', 'Courier New', monospace",
    width: '100%',
    transition: 'background 0.15s',
  },
}
