import { useState, useEffect, useCallback } from 'react'
import { EventManager } from "@/components/ui/event-manager"
import { useAuth } from '../context/AuthContext'
import {
  subscribeToScheduleEvents,
  createScheduleEvent,
  updateScheduleEvent,
  deleteScheduleEvent,
} from '../utils/scheduleEvents'

export default function SchedulePage() {
  const { user } = useAuth()
  const [events, setEvents] = useState(null) // null = loading

  useEffect(() => {
    if (!user?.uid) return
    const unsub = subscribeToScheduleEvents((docs) => {
      setEvents(
        docs.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description || '',
          startTime: e.startTime instanceof Date ? e.startTime : e.startTime?.toDate?.() ?? new Date(e.startTime),
          endTime: e.endTime instanceof Date ? e.endTime : e.endTime?.toDate?.() ?? new Date(e.endTime),
          color: e.color || 'blue',
          category: e.category || 'Meeting',
          tags: e.tags || [],
        }))
      )
    })
    return () => unsub()
  }, [user?.uid])

  const handleCreate = useCallback(async (event) => {
    try {
      await createScheduleEvent(user.uid, {
        title: event.title,
        description: event.description || '',
        startTime: event.startTime,
        endTime: event.endTime,
        color: event.color || 'blue',
        category: event.category || 'Meeting',
        tags: event.tags || [],
      })
    } catch (err) {
      console.error('Failed to create event:', err)
    }
  }, [user?.uid])

  const handleUpdate = useCallback(async (id, event) => {
    try {
      await updateScheduleEvent(id, {
        title: event.title,
        description: event.description || '',
        startTime: event.startTime,
        endTime: event.endTime,
        color: event.color || 'blue',
        category: event.category || 'Meeting',
        tags: event.tags || [],
      })
    } catch (err) {
      console.error('Failed to update event:', err)
    }
  }, [])

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteScheduleEvent(id)
    } catch (err) {
      console.error('Failed to delete event:', err)
    }
  }, [])

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="page-title">Schedule</h1>
        <p className="page-subtitle">Manage surveys, monitoring dives, meetings and field activities</p>
      </div>
      {events === null ? (
        <div className="flex items-center justify-center h-64 text-slate-500 text-sm">Loading schedule…</div>
      ) : (
        <EventManager
          key="schedule-manager"
          events={events}
          categories={["Survey", "Monitoring", "Meeting", "Training", "Review", "Deadline", "Trip"]}
          availableTags={["Important", "Urgent", "Field", "Community", "Government", "Team"]}
          defaultView="month"
          onEventCreate={handleCreate}
          onEventUpdate={handleUpdate}
          onEventDelete={handleDelete}
        />
      )}
    </div>
  )
}
