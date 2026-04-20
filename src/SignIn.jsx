import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from './firebase'

const F = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

export default function SignIn({ denied }) {
  const handleSignIn = () => {
    signInWithPopup(auth, googleProvider)
  }

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.logo}>◈</div>
        <h1 style={styles.title}>Attendance Tracker</h1>
        <p style={styles.subtitle}>Track your BELT score across a 12-week rolling window.</p>
        {denied && (
          <p style={styles.denied}>This account is not authorized to access this app.</p>
        )}
        <button onClick={handleSignIn} className="btn-primary" style={styles.button}>
          Sign in with Google →
        </button>
      </div>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: F,
  },
  card: {
    maxWidth: 400,
    width: '100%',
    padding: '0 24px',
    textAlign: 'center',
  },
  logo: {
    fontSize: 40,
    color: '#D4F535',
    marginBottom: 20,
    lineHeight: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    color: '#111111',
    margin: '0 0 10px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 1.6,
    margin: '0 0 36px',
  },
  denied: {
    fontSize: 13,
    color: '#9d174d',
    background: '#fff0f6',
    border: '1px solid #f9a8d4',
    borderRadius: 8,
    padding: '10px 16px',
    marginBottom: 20,
  },
  button: {
    background: '#111111',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    padding: '14px 28px',
    cursor: 'pointer',
    width: '100%',
    fontFamily: F,
    letterSpacing: '-0.01em',
  },
}
