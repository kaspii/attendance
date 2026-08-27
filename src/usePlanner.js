import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { emptyDays } from './beltUtils'

export default function usePlanner(uid) {
  const [plannerOffset, setPlannerOffsetState] = useState(4)
  const [plannerDays, setPlannerDaysState] = useState({})
  const [loading, setLoading] = useState(true)
  // Prevents the auto-save effect from firing during initial load
  const saveEnabled = useRef(false)

  useEffect(() => {
    if (!uid) return
    async function load() {
      try {
        const ref = doc(db, 'users', uid, 'planner', 'current')
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const data = snap.data()
          setPlannerOffsetState(data.offset ?? 4)
          setPlannerDaysState(data.days ?? {})
        }
      } catch (err) {
        console.error('Failed to load planner:', err)
      }
      saveEnabled.current = true
      setLoading(false)
    }
    load()
  }, [uid])

  // Auto-save to Firestore whenever offset or days change (skips initial load)
  useEffect(() => {
    if (!saveEnabled.current || !uid) return
    const ref = doc(db, 'users', uid, 'planner', 'current')
    setDoc(ref, { offset: plannerOffset, days: plannerDays }).catch(console.error)
  }, [plannerOffset, plannerDays, uid])

  const setPlannerOffset = useCallback((offset) => {
    setPlannerOffsetState(offset)
  }, [])

  const togglePlannerDay = useCallback((wid, day) => {
    setPlannerDaysState((prev) => {
      const weekDays = { ...(prev[wid] || emptyDays()) }
      weekDays[day] = !weekDays[day]
      return { ...prev, [wid]: weekDays }
    })
  }, [])

  const clearPlanner = useCallback(() => {
    setPlannerOffsetState(4)
    setPlannerDaysState({})
  }, [])

  return { plannerOffset, plannerDays, setPlannerOffset, togglePlannerDay, clearPlanner, loading }
}
