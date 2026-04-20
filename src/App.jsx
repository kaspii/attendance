import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import AttendanceTracker from './attendance-tracker'
import SignIn from './SignIn'

const ALLOWED_EMAILS = ['katherine.aspinwall@gmail.com']

const F = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u && !ALLOWED_EMAILS.includes(u.email)) {
        setDenied(true)
        await signOut(auth)
        setAuthLoading(false)
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
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F }}>
        <span style={{ color: '#9ca3af', fontSize: 14 }}>Loading…</span>
      </div>
    )
  }

  if (!user) {
    return <SignIn denied={denied} />
  }

  return <AttendanceTracker uid={user.uid} onSignOut={handleSignOut} />
}
