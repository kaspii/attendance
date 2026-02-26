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
        <h1 style={styles.title}>ATTENDANCE TRACKER</h1>
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
    background: '#0d0d0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DM Mono', 'Courier New', monospace",
  },
  card: {
    background: '#141416',
    border: '1px solid #2a2a2e',
    borderRadius: 12,
    padding: '48px 40px',
    textAlign: 'center',
    maxWidth: 360,
    width: '100%',
  },
  logo: {
    fontSize: 48,
    color: '#c8b97a',
    marginBottom: 16,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: '#e8e4dc',
  },
  subtitle: {
    margin: '8px 0 32px',
    fontSize: 11,
    letterSpacing: '0.08em',
    color: '#888',
    textTransform: 'uppercase',
  },
  denied: {
    color: '#f0a0a0',
    fontSize: 12,
    margin: '0 0 20px',
    padding: '10px 16px',
    background: '#2e1a1a',
    border: '1px solid #7a3030',
    borderRadius: 6,
  },
  button: {
    background: '#1a2a3a',
    border: '1px solid #2a4a6a',
    borderRadius: 8,
    color: '#6ab0e0',
    fontSize: 14,
    padding: '12px 24px',
    cursor: 'pointer',
    letterSpacing: '0.04em',
    fontFamily: "'DM Mono', 'Courier New', monospace",
    width: '100%',
  },
}
