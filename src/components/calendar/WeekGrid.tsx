import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { parseTime, minutesToTime, addDays, formatDate, isSameDay, snapToQuarter, format12Hour, formatFriendlyDate, diffInDays, parseDate } from './utils/calendarUtils';
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
  onEditingStart?: (eventId: string) => void;
  onEditingEnd?: (eventId: string) => void;
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
  setLastUsedCalendarId,
  onEditingStart,
  onEditingEnd
}) => {
  const [now, setNow] = useState(new Date());
  const gridRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<HTMLDivElement>(null);
  const editorInputRef = useRef<HTMLInputElement>(null);

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
      isPending: false, // confirm creation
    };
    onEventUpdate(updatedEvent);
    if (editingEventId) onEditingEnd?.(editingEventId); // Unlock event
    setEditingEventId(null);
    setLastUsedCalendarId(editingCalendarId); // Update last used calendar
  }, [editingEventId, editingTitle, editingType, editingCalendarId, editingIsAllDay, events, onEventUpdate, setEditingEventId, setLastUsedCalendarId, onEditingEnd]);

  const handleCancelEdit = useCallback(() => {
    setEvents(prev => {
      const event = prev.find(e => e.id === editingEventId);
      if (event?.isPending) {
        return prev.filter(e => e.id !== editingEventId);
      }
      return prev;
    });
    if (editingEventId) onEditingEnd?.(editingEventId); // Unlock event
    setEditingEventId(null);
  }, [setEditingEventId, editingEventId, setEvents, onEditingEnd]);

  const handleEditClick = useCallback((id: string, title: string, type: string, calendarId: string, isAllDay: boolean) => {
    onEditingStart?.(id); // Lock event
    setEditingEventId(id);
    setEditingTitle(title);
    setEditingType(type);
    setEditingCalendarId(calendarId);
    setEditingIsAllDay(isAllDay);
    setTimeout(() => editorInputRef.current?.select(), 0);
  }, [setEditingEventId, setEditingTitle, setEditingType, setEditingCalendarId, setEditingIsAllDay, onEditingStart]);

  const renderDayColumn = (dayOffset: number) => {
    const columnDate = addDays(selectedWeekStart, dayOffset);
    const isToday = isSameDay(columnDate, now);
    const dateStr = formatDate(columnDate);
    // Filter events for timed events active in this column
    const dayTimedEvents = weekEvents.filter(e => {
      if (e.isAllDay) return false;
      const start = e.date;
      const end = e.endDate || e.date;
      return start <= dateStr && end >= dateStr;
    });

    return (
      <div key={dayOffset} className="relative border-r border-outline-variant/20 last:border-r-0">
        {/* Hour grid lines */}
        {timeSlots.map((_, i) => (
          <div
            key={i}
            className="h-[52px] border-b border-outline-variant/10"
          />
        ))}

        {/* Events */}
        {dayTimedEvents.map(event => {
          const eventStartMinutes = parseTime(event.startTime || '09:00');
          const eventEndMinutes = parseTime(event.endTime || '10:00');

          const topMinutes = Math.max(START_HOUR * 60, eventStartMinutes);
          const bottomMinutes = Math.min(END_HOUR * 60, eventEndMinutes);

          // Position inside the day column inside slotsRef (no HEADER_H offset inside slotsRef)
          const top = ((topMinutes - START_HOUR * 60) / 60) * SLOT_H;
          const height = Math.max(26, ((bottomMinutes - topMinutes) / 60) * SLOT_H);
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
      </div>
    );
  };

  return (
    <div
      ref={gridRef}
      className="border border-outline-variant/40 rounded-xl bg-surface-container-lowest overflow-hidden"
    >
      {/* Day headers row */}
      <div className="grid grid-cols-[80px_repeat(7,_1fr)] border-b border-outline-variant/30">
        {/* Time label column header spacer */}
        <div className="h-[52px] border-r border-outline-variant/30 bg-surface"></div>
        {/* Day headers */}
        {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
          const columnDate = addDays(selectedWeekStart, dayOffset);
          const isToday = isSameDay(columnDate, now);
          return (
            <div
              key={dayOffset}
              className={`h-[52px] text-center flex flex-col justify-center border-r border-outline-variant/20 last:border-r-0 ${
                isToday ? 'bg-primary/5' : 'bg-surface'
              }`}
            >
              <div className="text-xs text-secondary uppercase font-mono">
                {columnDate.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className={`text-2xl font-bold ${isToday ? 'text-primary' : 'text-on-surface'}`}>
                {columnDate.getDate()}
              </div>
            </div>
          );
        })}
      </div>

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
            const top = ((parseTime(draggingNew.startTime) - START_HOUR * 60) / 60) * SLOT_H;
            const height = Math.max(26, ((parseTime(draggingNew.endTime) - parseTime(draggingNew.startTime)) / 60) * SLOT_H);
            const left = TIME_LABEL_WIDTH + (draggingNew.startDay * columnWidth);
            const width = (draggingNew.endDay - draggingNew.startDay + 1) * columnWidth - 8;
            const timeText = `${format12Hour(draggingNew.startTime)} – ${format12Hour(draggingNew.endTime)}`;

            return (
              <div
                className="absolute rounded-lg px-3 py-1.5 text-xs border border-primary bg-primary/25 text-on-surface shadow-md backdrop-blur-xs flex flex-col justify-between"
                style={{
                  left: `${left}px`,
                  width: `${width}px`,
                  top: `${top}px`,
                  height: `${height}px`,
                  zIndex: 100,
                  pointerEvents: 'none'
                }}
              >
                <div className="font-semibold text-primary truncate">New Event</div>
                <div className="text-[11px] opacity-80 font-mono truncate">{timeText}</div>
              </div>
            );
          })()}

          {/* Popover inline editor (Google Calendar Style Card) */}
          {editingEventId && (() => {
            const editingEvent = events.find(e => e.id === editingEventId);
            if (!editingEvent) return null;
            const rect = slotsRef.current?.getBoundingClientRect();
            const columnWidth = rect ? (rect.width - TIME_LABEL_WIDTH) / 7 : 0;

            const dayIndex = editingEvent.date
              ? diffInDays(parseDate(editingEvent.date), selectedWeekStart)
              : 0;
            const clampedDay = Math.max(0, Math.min(6, dayIndex));

            const editorTop = ((parseTime(editingEvent.startTime || '09:00') - START_HOUR * 60) / 60) * SLOT_H;

            // Position editor popover dynamically anchored to the selected event column
            let editorLeft = TIME_LABEL_WIDTH + clampedDay * columnWidth + 10;
            if (editorLeft + 310 > (rect?.width || 800)) {
              editorLeft = Math.max(10, TIME_LABEL_WIDTH + clampedDay * columnWidth - 300);
            }

            const formattedDate = formatFriendlyDate(editingEvent.date);
            const timeRangeText = editingIsAllDay
              ? formattedDate
              : `${formattedDate} · ${format12Hour(editingEvent.startTime)} – ${format12Hour(editingEvent.endTime)}`;

            return (
              <div
                className="absolute bg-surface-container p-4 rounded-2xl shadow-2xl border border-outline-variant/40 z-50 flex flex-col gap-3 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
                style={{
                  top: `${editorTop}px`,
                  left: `${editorLeft}px`,
                  width: '300px',
                  maxHeight: '420px'
                }}
              >
                {/* Title Input */}
                <input
                  ref={editorInputRef}
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  placeholder="Add title"
                  className="text-base font-semibold bg-transparent border-b border-outline-variant/40 pb-1.5 focus:border-primary focus:outline-none transition-colors"
                  autoFocus
                />

                {/* Event Type Selector Pills */}
                <div className="flex gap-1.5">
                  {['Event', 'Exam', 'Lecture', 'Deadline'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEditingType(type)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                        editingType === type
                          ? 'bg-primary text-on-primary shadow-xs'
                          : 'bg-surface-container-high hover:bg-surface-container-highest text-secondary'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {/* Date & Time Range Info */}
                <div className="flex items-center gap-2 text-xs text-secondary font-medium py-1">
                  <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="truncate">{timeRangeText}</span>
                </div>

                {/* Calendar Picker & All Day Checkbox */}
                <div className="flex flex-col gap-2.5 pt-1 border-t border-outline-variant/20">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-secondary font-medium">Calendar</span>
                    <select
                      value={editingCalendarId}
                      onChange={(e) => setEditingCalendarId(e.target.value)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline-variant/30 text-on-surface focus:outline-none"
                    >
                      {calendars.filter(c => visibleCalendars.includes(c.id)).map(cal => (
                        <option key={cal.id} value={cal.id}>
                          {cal.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label htmlFor={`isAllDayEvent-${editingEventId}`} className="flex items-center gap-2 text-xs text-on-surface cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id={`isAllDayEvent-${editingEventId}`}
                      checked={editingIsAllDay}
                      onChange={(e) => setEditingIsAllDay(e.target.checked)}
                      className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                    />
                    <span>All day</span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-end pt-2 border-t border-outline-variant/20 mt-auto">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs px-3.5 py-1.5 rounded-lg text-secondary hover:bg-surface-container-high transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="text-xs px-4 py-1.5 bg-primary text-on-primary font-medium rounded-lg shadow-xs hover:opacity-90 transition-opacity"
                  >
                    Save
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Current time line (today only) */}
          {(() => {
            const todayIndex = [0, 1, 2, 3, 4, 5, 6].findIndex(offset =>
              isSameDay(addDays(selectedWeekStart, offset), now)
            );
            if (todayIndex === -1 || now.getHours() < START_HOUR || now.getHours() >= END_HOUR) {
              return null;
            }
            const rect = slotsRef.current?.getBoundingClientRect();
            const columnWidth = rect ? (rect.width - TIME_LABEL_WIDTH) / 7 : 0;
            const topPos = (((now.getHours() - START_HOUR) * 60 + now.getMinutes()) / 60) * SLOT_H;

            return (
              <div
                className="absolute z-20 flex items-center pointer-events-none"
                style={{
                  left: `${TIME_LABEL_WIDTH + todayIndex * columnWidth}px`,
                  width: `${columnWidth}px`,
                  top: `${topPos}px`
                }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

