import { ScheduleEvent, Task, Note } from '../../types';

export interface ConnectorSourceMetadata {
  provider: 'google_calendar' | 'google_drive' | 'gmail' | 'sakido';
  externalId?: string;
  syncStatus: 'synced' | 'pending' | 'error';
  providerIcon?: string;
  accountEmail?: string;
  lastSyncedAt?: string;
}

export interface UnifiedScheduleEvent extends ScheduleEvent {
  source: ConnectorSourceMetadata;
}

export interface UnifiedTask extends Task {
  source: ConnectorSourceMetadata;
}

export interface UnifiedNote extends Note {
  source: ConnectorSourceMetadata;
}

/**
 * Normalizes raw Google Calendar API event item into native Sakido ScheduleEvent
 */
export function normalizeGoogleCalendarEvent(
  rawEvent: any,
  accountEmail?: string
): UnifiedScheduleEvent {
  const startDateTime = rawEvent.start?.dateTime || rawEvent.start?.date || '';
  const endDateTime = rawEvent.end?.dateTime || rawEvent.end?.date || '';

  const startDate = startDateTime ? new Date(startDateTime) : new Date();
  const endDate = endDateTime ? new Date(endDateTime) : new Date(startDate.getTime() + 60 * 60 * 1000);

  const startTimeStr = startDate.toTimeString().substring(0, 5); // HH:MM
  const endTimeStr = endDate.toTimeString().substring(0, 5);     // HH:MM

  const dayOfWeek = startDate.getDay() === 0 ? 7 : startDate.getDay(); // 1 (Mon) - 7 (Sun)

  return {
    id: `gcal-${rawEvent.id}`,
    courseId: 'external-gcal',
    courseCode: 'GCAL',
    courseName: rawEvent.summary || 'Google Calendar Event',
    room: rawEvent.location || 'Online / Google Meet',
    instructor: rawEvent.organizer?.displayName || rawEvent.organizer?.email || 'External Sync',
    dayOfWeek,
    startTime: startTimeStr,
    endTime: endTimeStr,
    date: startDate.toISOString().split('T')[0],
    type: 'lecture',
    color: '#8B5E3C', // Sakido Primary
    source: {
      provider: 'google_calendar',
      externalId: rawEvent.id,
      syncStatus: 'synced',
      providerIcon: '/logos/google-calendar.webp',
      accountEmail,
      lastSyncedAt: new Date().toISOString(),
    },
  };
}

/**
 * Normalizes Google Drive files into Sakido Note format
 */
export function normalizeGoogleDriveFile(
  rawFile: any,
  accountEmail?: string
): UnifiedNote {
  return {
    id: `gdrive-${rawFile.id}`,
    title: rawFile.name || 'Untitled Google Drive Note',
    content: rawFile.description || `Synced Google Drive Document\nLink: ${rawFile.webViewLink || '#'}`,
    courseId: 'gdrive-sync',
    courseName: 'Google Drive',
    courseColor: '#4285F4',
    updatedAt: rawFile.modifiedTime || new Date().toISOString(),
    tags: ['Google Drive', 'Auto-Synced'],
    isPinned: false,
    type: 'summary',
    source: {
      provider: 'google_drive',
      externalId: rawFile.id,
      syncStatus: 'synced',
      providerIcon: '/logos/google-drive.webp',
      accountEmail,
      lastSyncedAt: new Date().toISOString(),
    },
  };
}
