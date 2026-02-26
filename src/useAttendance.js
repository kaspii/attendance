import { useState, useEffect, useCallback } from 'react'
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { db } from './firebase'

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addWeeks(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n * 7)
  return d
}

function weekId(monday) {
  return monday.toISOString().slice(0, 10) // e.g. "2026-02-23"
}

function emptyDays() {
  return { Mon: false, Tue: false, Wed: false, Thu: false, Fri: false }
}

function buildWeekWindow() {
  const currentMonday = getMonday(new Date())
  const weeks = []
  for (let i = 11; i >= 0; i--) {
    const monday = addWeeks(currentMonday, -i)
    weeks.push({
      id: weekId(monday),
      monday,
      days: emptyDays(),
    })
  }
  return weeks
}

export default function useAttendance(uid) {
  const [weeks, setWeeks] = useState(buildWeekWindow)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return

    async function fetchWeeks() {
      setLoading(true)
      try {
        const weeksRef = collection(db, 'users', uid, 'weeks')
        const snapshot = await getDocs(weeksRef)

        const saved = {}
        snapshot.forEach((doc) => {
          saved[doc.id] = doc.data().days
        })

        setWeeks((prev) =>
          prev.map((w) => ({
            ...w,
            days: saved[w.id] ? { ...emptyDays(), ...saved[w.id] } : w.days,
          }))
        )
      } catch (err) {
        console.error('Failed to fetch attendance data:', err)
      }
      setLoading(false)
    }

    fetchWeeks()
  }, [uid])

  const toggleDay = useCallback(
    async (wId, day) => {
      if (!uid) return

      setWeeks((prev) =>
        prev.map((w) =>
          w.id === wId
            ? { ...w, days: { ...w.days, [day]: !w.days[day] } }
            : w
        )
      )

      // Read current state to get the toggled value
      const week = weeks.find((w) => w.id === wId)
      if (!week) return

      const newDays = { ...week.days, [day]: !week.days[day] }
      const weekDocRef = doc(db, 'users', uid, 'weeks', wId)
      await setDoc(weekDocRef, { days: newDays })
    },
    [uid, weeks]
  )

  return { weeks, toggleDay, loading }
}
