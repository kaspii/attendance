import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import AttendanceTracker from './attendance-tracker'
import SignIn from './SignIn'

const ALLOWED_EMAILS = ['katherine.aspinwall@gmail.com']

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u && !ALLOWED_EMAILS.includes(u.email)) {
        setDenied(true)
        await signOut(auth)
        return
      }
      setDenied(false)
      setUser(u)
      setAuthLoading(false)
    })
    return unsubscribe
  }, [])

  const handleSignOut = () => signOut(auth)

  if (authLoading) {
    return (
      <div style={styles.loading}>
        <span style={styles.loadingText}>Loading…</span>
      </div>
    )
  }

  if (!user) {
    return <SignIn denied={denied} />
  }

  return <AttendanceTracker uid={user.uid} onSignOut={handleSignOut} />
}

const styles = {
  loading: {
    minHeight: '100vh',
    background: '#0d0d0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888',
    fontFamily: "'DM Mono', 'Courier New', monospace",
    fontSize: 14,
  },
}
