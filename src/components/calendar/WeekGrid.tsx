import React, { useState, useEffect, useRef, useCallback } from 'react';
import { parseTime, minutesToTime, addDays, formatDate, isSameDay, snapToQuarter } from './utils/calendarUtils';
import { useCalendarDrag } from './hooks/useCalendarDrag';
import { EventBlock } from './EventBlock';
import { AllDayRow } from './AllDayRow';

const HEADER_H = 52; // Height of the day header
const SLOT_H = 52; // Height of each hourly slot (52px/hour)
const START_HOUR = 0; // Start hour of the grid (midnight)
const END_HOUR = 24; // End hour of the grid (midnight next day)
const TIME_LABEL_WIDTH = 80; // Width of the time label column

export interface WeekGridProps {
  selectedWeekStart: Date;
  events: any[];
  calendars: any[];
  visibleCalendars: string[];
  onEventUpdate: (event: any) => void;
  onEventCreate: (event: any) => void;
  setEvents: React.Dispatch<React.SetStateAction<any[]>>; // Pass setEvents to useCalendarDrag
  lastUsedCalendarId: string;
  setLastUsedCalendarId: React.Dispatch<React.SetStateAction<string>>; // Add setLastUsedCalendarId
}

export const WeekGrid: React.FC<WeekGridProps> = ({
  selectedWeekStart,
  events,
  calendars,
  visibleCalendars,
  onEventUpdate,
  onEventCreate,
  setEvents,
  lastUsedCalendarId,
  setLastUsedCalendarId
}) => {
  const [now, setNow] = useState(new Date());
  const gridRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<HTMLDivElement>(null);

  const getCalendarColor = useCallback((calendarId: string): string => {
    const calendar = calendars.find(c => c.id === calendarId);
    return calendar?.color || '#8b5e3c'; // Default color
  }, [calendars]);

  const {
    draggingNew,
    resizingEvent,
    movingEvent,
    editingEventId,
    editingTitle,
    editingType,
    editingCalendarId,
    setEditingEventId,
    setEditingTitle,
    setEditingType,
    setEditingCalendarId,
    editingIsAllDay,
    setEditingIsAllDay,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleEventPointerDown,
  } = useCalendarDrag(
    gridRef,
    slotsRef,
    selectedWeekStart,
    events,
    setEvents,
    onEventCreate,
    onEventUpdate,
    getCalendarColor,
    lastUsedCalendarId,
    calendars,
    setLastUsedCalendarId
  );

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const timeSlots = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
    const hour = i + START_HOUR;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // Filter events by visible calendars and current week
  const weekStartStr = formatDate(selectedWeekStart);
  const weekEndStr = formatDate(addDays(selectedWeekStart, 6));
  const weekEvents = events.filter(e => {
    if (!visibleCalendars.includes(e.calendarId)) return false;
    // Compare the event range against the week range so multi-day events that
    // start before (or end after) the week are still shown, matching AllDayRow.
    const start = e.date;
    const end = e.endDate || e.date;
    return start <= weekEndStr && end >= weekStartStr;
  });

  const handleSaveEdit = useCallback(() => {
    const event = events.find(e => e.id === editingEventId);
    if (!event) return;

    const updatedEvent = {
      ...event,
      title: editingTitle.trim() || 'New Event',
      type: editingType,
      calendarId: editingCalendarId,
      isAllDay: editingIsAllDay,
      // Clear time fields when the event becomes all-day so AllDayRow and the
      // day-column filter (which excludes isAllDay) both interpret it correctly.
      startTime: editingIsAllDay ? undefined : event.startTime,
      endTime: editingIsAllDay ? undefined : event.endTime,
      time: editingIsAllDay ? undefined : event.time,
    };
    onEventUpdate(updatedEvent);
    setEditingEventId(null);
    setLastUsedCalendarId(editingCalendarId); // Update last used calendar
  }, [editingEventId, editingTitle, editingType, editingCalendarId, editingIsAllDay, events, onEventUpdate, setEditingEventId, setLastUsedCalendarId]);

  const handleCancelEdit = useCallback(() => {
    setEditingEventId(null);
  }, [setEditingEventId]);

  const handleEditClick = useCallback((id: string, title: string, type: string, calendarId: string, isAllDay: boolean) => {
    setEditingEventId(id);
    setEditingTitle(title);
    setEditingType(type);
    setEditingCalendarId(calendarId);
    setEditingIsAllDay(isAllDay);
  }, [setEditingEventId, setEditingTitle, setEditingType, setEditingCalendarId, setEditingIsAllDay]);

  const renderDayColumn = (dayOffset: number) => {
    const columnDate = addDays(selectedWeekStart, dayOffset);
    const isToday = isSameDay(columnDate, now);
    const dateStr = formatDate(columnDate);
    // Filter events for timed events in this column
    const dayTimedEvents = weekEvents.filter(e => e.date === dateStr && !e.isAllDay && !e.endDate);

    return (
      <div key={dayOffset} className="relative border-r border-outline-variant/20 last:border-r-0">
        {/* Day header */}
        <div
          className={`sticky top-0 z-10 text-center border-b border-outline-variant/30 flex flex-col justify-center ${
            isToday ? 'bg-primary/5' : 'bg-surface'
          }`}
          style={{ height: `${HEADER_H}px` }}
        >
          <div className="text-xs text-secondary uppercase font-mono">
            {columnDate.toLocaleDateString('en-US', { weekday: 'short' })}
          </div>
          <div className={`text-2xl font-bold ${isToday ? 'text-primary' : 'text-on-surface'}`}>
            {columnDate.getDate()}
          </div>
        </div>

        {/* Hour grid lines */}
        {timeSlots.map((_, i) => (
          <div
            key={i}
            className="h-[52px] border-b border-outline-variant/10"
          />
        ))}

        {/* Events */}
        {dayTimedEvents.map(event => {
          const eventStartMinutes = parseTime(event.startTime);
          const eventEndMinutes = parseTime(event.endTime);

          const topMinutes = Math.max(START_HOUR * 60, eventStartMinutes);
          const bottomMinutes = Math.min(END_HOUR * 60, eventEndMinutes);

          const top = HEADER_H + ((topMinutes - START_HOUR * 60) / 60) * SLOT_H;
          const height = ((bottomMinutes - topMinutes) / 60) * SLOT_H;
          const color = getCalendarColor(event.calendarId);

          const isBeingDragged = movingEvent?.id === event.id;
          const isBeingResized = resizingEvent?.id === event.id;

          return (
            <EventBlock
              key={event.id}
              event={event}
              calendarColor={color}
              onPointerDown={handleEventPointerDown}
              onEditClick={handleEditClick}
              top={top}
              height={height}
              isEditing={editingEventId === event.id}
              isBeingDragged={isBeingDragged}
              isBeingResized={isBeingResized}
              isAllDay={event.isAllDay}
            />
          );
        })}

        {/* Removed single-column preview - now rendered outside column loop */}

        {/* Removed inline editor - now rendered outside column loop */}

        {/* Current time line (today only) - fixed hour boundary */}
        {isToday && now.getHours() >= START_HOUR && now.getHours() <= END_HOUR && (
          <div
            className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
            style={{
              top: `${HEADER_H + (((now.getHours() - START_HOUR) * 60 + now.getMinutes()) / 60) * SLOT_H}px`
            }}
          >
            <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
            <div className="flex-1 h-0.5 bg-red-500" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={gridRef}
      className="border border-outline-variant/40 rounded-xl bg-surface-container-lowest overflow-hidden"
    >
      {/* All-day row */}
      <AllDayRow
        events={events}
        selectedWeekStart={selectedWeekStart}
        calendars={calendars}
        visibleCalendars={visibleCalendars}
        onEventUpdate={onEventUpdate}
        onEditClick={handleEditClick}
      />
      {/* Scrollable time slots container */}
      <div className="overflow-y-auto max-h-[calc(100vh-400px)]">
        <div className="relative">
          <div
            ref={slotsRef}
            className="grid grid-cols-[80px_repeat(7,_1fr)]"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
          {/* Time labels column */}
          <div className="border-r border-outline-variant/30 bg-surface sticky left-0 z-20">
            <div className="h-[52px] border-b border-outline-variant/30 flex items-center justify-end pr-2 text-sm font-mono text-secondary"></div> {/* Header spacer */}
            {timeSlots.map((slot, i) => (
              <div
                key={i}
                className="h-[52px] border-b border-outline-variant/10 flex items-start justify-end pr-2 pt-1 text-xs font-mono text-secondary"
              >
                {slot}
              </div>
            ))}
          </div>

          {/* 7 day columns */}
          {[0, 1, 2, 3, 4, 5, 6].map(renderDayColumn)}
          </div>

          {/* Multi-day drag preview overlay */}
          {draggingNew && (() => {
            const rect = slotsRef.current?.getBoundingClientRect();
            const columnWidth = rect ? (rect.width - TIME_LABEL_WIDTH) / 7 : 0;
            return (
              <div
                className="absolute rounded px-2 py-1 text-xs border bg-blue-500/20 border-blue-500 text-blue-800"
                style={{
                  left: `${TIME_LABEL_WIDTH + (draggingNew.startDay * columnWidth)}px`,
                  width: `${(draggingNew.endDay - draggingNew.startDay + 1) * columnWidth - 8}px`,
                  top: `${HEADER_H + ((parseTime(draggingNew.startTime) - START_HOUR * 60) / 60) * SLOT_H}px`,
                  height: `${Math.max(26, ((parseTime(draggingNew.endTime) - parseTime(draggingNew.startTime)) / 60) * SLOT_H)}px`,
                  zIndex: 100,
                  pointerEvents: 'none'
                }}
              >
                <div className="font-medium truncate">New Event</div>
              </div>
            );
          })()}

          {/* Popover inline editor */}
          {editingEventId && (() => {
            const editingEvent = events.find(e => e.id === editingEventId);
            if (!editingEvent) return null;
            const editorTop = HEADER_H + ((parseTime(editingEvent.startTime || '09:00') - START_HOUR * 60) / 60) * SLOT_H;
            return (
              <div
                className="absolute left-2 bg-surface-container p-3 rounded-lg shadow-xl border border-outline-variant/30 z-50 flex flex-col gap-2"
                style={{
                  top: `${editorTop}px`,
                  width: '280px',
                  maxHeight: '400px'
                }}
              >
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  placeholder="Add title"
                  className="text-sm font-medium bg-transparent border-b focus:outline-none"
                  autoFocus
                />
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex gap-2">
                    <select
                      value={editingType}
                      onChange={(e) => setEditingType(e.target.value)}
                      className="text-xs px-2 py-1 rounded bg-surface-container-high"
                    >
                      <option value="Event">Event</option>
                      <option value="Exam">Exam</option>
                      <option value="Lecture">Lecture</option>
                      <option value="Deadline">Deadline</option>
                    </select>
                    <select
                      value={editingCalendarId}
                      onChange={(e) => setEditingCalendarId(e.target.value)}
                      className="text-xs px-2 py-1 rounded bg-surface-container-high flex-1"
                    >
                      {calendars.filter(c => visibleCalendars.includes(c.id)).map(cal => (
                        <option key={cal.id} value={cal.id}>
                          {cal.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id={`isAllDayEvent-${editingEventId}`}
                      checked={editingIsAllDay}
                      onChange={(e) => setEditingIsAllDay(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor={`isAllDayEvent-${editingEventId}`} className="text-sm text-on-surface">All day</label>
                  </div>
                </div>
                <div className="flex gap-2 justify-end mt-auto">
                  <button onClick={handleCancelEdit} className="text-xs px-3 py-1">Cancel</button>
                  <button onClick={handleSaveEdit} className="text-xs px-3 py-1 bg-primary text-white rounded">Save</button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
