import { useEffect } from 'react';

interface Calendar {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  source: 'sakido' | 'google';
  isDefault?: boolean;
  googleCalendarId?: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  type?: 'Exam' | 'Lecture' | 'Deadline' | 'Event' | 'Google Cal';
  calendarId?: string;
  [key: string]: any;
}

const DEFAULT_CALENDARS: Calendar[] = [
  {
    id: 'cal-classes',
    name: 'Classes',
    color: '#2563eb',
    visible: true,
    source: 'sakido'
  },
  {
    id: 'cal-exams',
    name: 'Exams',
    color: '#f59e0b',
    visible: true,
    source: 'sakido'
  },
  {
    id: 'cal-deadlines',
    name: 'Deadlines',
    color: '#dc2626',
    visible: true,
    source: 'sakido'
  },
  {
    id: 'cal-personal',
    name: 'Personal',
    color: '#8b5e3c',
    visible: true,
    source: 'sakido',
    isDefault: true
  }
];

export const TYPE_TO_CALENDAR_MAP: Record<string, string> = {
  'Lecture': 'cal-classes',
  'Exam': 'cal-exams',
  'Deadline': 'cal-deadlines',
  'Event': 'cal-personal',
  'Google Cal': 'cal-personal'
};

/**
 * One-time migration hook: Adds calendarId to existing events based on their type,
 * and creates default calendars if they don't exist.
 */
export function useMigrateToCalendars(
  events: Event[],
  setEvents: (events: Event[]) => void,
  calendars: Calendar[],
  setCalendars: (calendars: Calendar[]) => void
) {
  useEffect(() => {
    // Step 1: Always ensure default calendars exist
    let updatedCalendars = [...calendars];
    let calendarsAdded = false;

    DEFAULT_CALENDARS.forEach(defaultCal => {
      if (!updatedCalendars.some(c => c.id === defaultCal.id)) {
        updatedCalendars.push(defaultCal);
        calendarsAdded = true;
      }
    });

    if (calendarsAdded) {
      setCalendars(updatedCalendars);
      console.log('[Migration] Created default calendars:', updatedCalendars);
    }

    // Step 2: Check if events need calendarId migration
    const needsMigration = events.length > 0 && events.some(e => !e.calendarId);

    if (!needsMigration) {
      return; // Events already migrated or no events
    }

    console.log('[Migration] Starting calendar migration...');

    // Step 3: Backfill calendarId on existing events based on type
    const migratedEvents = events.map(event => {
      if (event.calendarId) {
        return event; // Already has calendarId, skip
      }

      const calendarId = TYPE_TO_CALENDAR_MAP[event.type || 'Event'] || 'cal-personal';

      return {
        ...event,
        calendarId
      };
    });

    const migratedCount = migratedEvents.filter((e, i) => e.calendarId !== events[i].calendarId).length;

    if (migratedCount > 0) {
      setEvents(migratedEvents);
      console.log(`[Migration] Migrated ${migratedCount} events with calendarId`);
    }

    console.log('[Migration] Complete');
  }, []); // Run once on mount
}
