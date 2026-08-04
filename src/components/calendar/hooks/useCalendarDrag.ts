import React, { useState, useRef, useCallback, useEffect } from 'react';
import { parseTime, minutesToTime, snapToQuarter, addDays, formatDate, parseDate, diffInDays } from '../utils/calendarUtils';

const SLOT_H = 52; // Height of each hourly slot (52px/hour)
const HEADER_H = 52; // Height of the day header above the first hour slot
const START_HOUR = 0; // Start hour of the grid (midnight)
const END_HOUR = 24; // End hour of the grid (midnight next day)
const TIME_LABEL_WIDTH = 80; // Width of the time label column

interface DraggingNewState {
  startDay: number;
  endDay: number;
  startTime: string;
  endTime: string;
  startDate: string;
  startY: number; // For vertical drag calculation
  startX: number; // For horizontal drag calculation
  initialTime: string;
  initialDay: number;
}

interface ResizingEventState {
  id: string;
  edge: 'top' | 'bottom';
  originalStartTime: string;
  originalEndTime: string;
  startY: number;
}

interface MovingEventState {
  id: string;
  offsetY: number;
  offsetX: number;
  originalDate: string;
  originalStartTime: string;
  originalEndTime: string;
  previewDate?: string;
  previewStartTime?: string;
  previewEndTime?: string;
  previewDayIndex?: number;
}

export const useCalendarDrag = (
  gridRef: React.RefObject<HTMLDivElement | null>,
  slotsRef: React.RefObject<HTMLDivElement | null>,
  selectedWeekStart: Date,
  events: any[],
  setEvents: React.Dispatch<React.SetStateAction<any[]>>,
  onEventCreate: (event: any) => void,
  onEventUpdate: (event: any) => void,
  getCalendarColor: (calendarId: string) => string,
  lastUsedCalendarId: string,
  calendars: any[],
  setLastUsedCalendarId: React.Dispatch<React.SetStateAction<string>>,
) => {
  const [draggingNew, setDraggingNew] = useState<DraggingNewState | null>(null);
  const [resizingEvent, setResizingEvent] = useState<ResizingEventState | null>(null);
  const [movingEvent, setMovingEvent] = useState<MovingEventState | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingType, setEditingType] = useState('Event');
  const [editingCalendarId, setEditingCalendarId] = useState<string>(lastUsedCalendarId);
  const [editingIsAllDay, setEditingIsAllDay] = useState<boolean>(false);
  const [editingColor, setEditingColor] = useState<string>('');
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [capturedElement, setCapturedElement] = useState<Element | null>(null);

  useEffect(() => {
    setEditingCalendarId(lastUsedCalendarId);
  }, [lastUsedCalendarId]);

  const getGridRect = useCallback(() => {
    return gridRef.current?.getBoundingClientRect();
  }, [gridRef]);

  const getColumnWidth = useCallback(() => {
    const rect = getGridRect();
    return rect ? (rect.width - TIME_LABEL_WIDTH) / 7 : 0;
  }, [getGridRect]);

  const clientXToDayIndex = useCallback((clientX: number) => {
    const rect = getGridRect();
    const columnWidth = getColumnWidth();
    if (!rect || columnWidth === 0) return 0;

    const offsetX = clientX - (rect.left + TIME_LABEL_WIDTH);
    return Math.max(0, Math.min(6, Math.floor(offsetX / columnWidth)));
  }, [getGridRect, getColumnWidth]);

  const clientYToGridTime = useCallback((clientY: number) => {
    // Measure from the hour-slot grid (below the all-day row).
    // The grid element is slotsRef, which starts right below the all-day row.
    const rect = slotsRef.current?.getBoundingClientRect();
    if (!rect) return minutesToTime(START_HOUR * 60);

    const offsetPx = clientY - rect.top;
    const minutesFromTop = (offsetPx / SLOT_H) * 60;
    const snappedMinutes = snapToQuarter(minutesFromTop + START_HOUR * 60);
    return minutesToTime(Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, snappedMinutes)));
  }, [slotsRef]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.event-block') || !gridRef.current) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragStartPos({ x: e.clientX, y: e.clientY });

    // Reset stale editing states from previous interactions
    setEditingIsAllDay(false);
    setEditingType('Event');

    const rect = getGridRect();
    if (!rect) return;

    const startTime = clientYToGridTime(e.clientY);
    const startDay = clientXToDayIndex(e.clientX);
    const startDate = formatDate(addDays(selectedWeekStart, startDay));

    setDraggingNew({
      startTime,
      endTime: startTime,
      startDay,
      endDay: startDay,
      startDate,
      startY: e.clientY,
      startX: e.clientX,
      initialTime: startTime,
      initialDay: startDay,
    });
  }, [gridRef, getGridRect, clientYToGridTime, clientXToDayIndex, selectedWeekStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!gridRef.current) return;

    if (draggingNew) {
      const currentTime = clientYToGridTime(e.clientY);
      const currentDay = clientXToDayIndex(e.clientX);

      const newStartDay = Math.min(draggingNew.initialDay, currentDay);
      const newEndDay = Math.max(draggingNew.initialDay, currentDay);

      const newStartTime = parseTime(draggingNew.initialTime) < parseTime(currentTime)
        ? draggingNew.initialTime
        : currentTime;
      const newEndTime = parseTime(draggingNew.initialTime) < parseTime(currentTime)
        ? currentTime
        : draggingNew.initialTime;

      setDraggingNew(prev => prev ? {
        ...prev,
        startDay: newStartDay,
        endDay: newEndDay,
        startTime: newStartTime,
        endTime: newEndTime,
      } : null);
    } else if (resizingEvent) {
      const currentTime = clientYToGridTime(e.clientY);
      setResizingEvent(prev => {
        if (!prev) return null;
        // Clamp so start always stays before end (min one snap step).
        if (prev.edge === 'top') {
          const maxStart = parseTime(prev.originalEndTime) - 15;
          const clamped = Math.min(parseTime(currentTime), maxStart);
          return { ...prev, originalStartTime: minutesToTime(clamped) };
        } else {
          const minEnd = parseTime(prev.originalStartTime) + 15;
          const clamped = Math.max(parseTime(currentTime), minEnd);
          return { ...prev, originalEndTime: minutesToTime(clamped) };
        }
      });
    } else if (movingEvent) {
      const rect = getGridRect();
      if (!rect) return;
      const columnWidth = getColumnWidth();
      if (columnWidth === 0) return;

      const newDayIndex = clientXToDayIndex(e.clientX - movingEvent.offsetX);
      const newTime = clientYToGridTime(e.clientY - movingEvent.offsetY);

      // Preview update - actual update on pointerUp
      const eventToMove = events.find(ev => ev.id === movingEvent.id);
      if (eventToMove) {
        // Calculate day change (parse the date-only string in local time —
        // new Date("YYYY-MM-DD") parses as UTC and shifts the index west of UTC)
        const originalDayIndex = diffInDays(parseDate(eventToMove.date), selectedWeekStart);
        const dayChange = newDayIndex - originalDayIndex;

        // Calculate time change
        const originalStartMinutes = parseTime(movingEvent.originalStartTime);
        const newStartMinutes = parseTime(newTime);
        const timeChange = newStartMinutes - originalStartMinutes;

        // Apply changes for preview
        const previewDate = formatDate(addDays(parseDate(eventToMove.date), dayChange));
        const previewStartTime = minutesToTime(parseTime(eventToMove.startTime) + timeChange);
        const previewEndTime = minutesToTime(parseTime(eventToMove.endTime) + timeChange);

        // Update some preview state here (e.g., setPreviewEvent or update movingEvent to include preview coords)
        setMovingEvent(prev => prev ? {
          ...prev,
          previewDate,
          previewStartTime,
          previewEndTime,
          previewDayIndex: newDayIndex
        } : null);
      }
    }
  }, [draggingNew, resizingEvent, movingEvent, events, getGridRect, getColumnWidth, clientYToGridTime, clientXToDayIndex, selectedWeekStart]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // Clear on cancel
    if (e.type === 'pointercancel') {
      setDraggingNew(null);
      setResizingEvent(null);
      setMovingEvent(null);
      setDragStartPos(null);
      if (capturedElement) {
        capturedElement.releasePointerCapture(e.pointerId);
        setCapturedElement(null);
      }
      e.currentTarget.releasePointerCapture(e.pointerId);
      return;
    }

    if (draggingNew) {
      // Check if this was a click (movement < 5px) vs actual drag
      const movedDistance = dragStartPos
        ? Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y)
        : 999;
      const wasClick = movedDistance < 5;

      const startDate = addDays(selectedWeekStart, draggingNew.startDay);
      const endDate = addDays(selectedWeekStart, draggingNew.endDay);

      const defaultCalendar = calendars.find(c => c.isDefault) || calendars[0];
      const targetCalendarId = editingCalendarId || defaultCalendar?.id;

      // Click creates 1-hour event, drag enforces 15-min minimum
      const startMinutes = parseTime(draggingNew.startTime);
      const endMinutes = wasClick
        ? startMinutes + 60  // 1-hour default for clicks
        : Math.max(parseTime(draggingNew.endTime), startMinutes + 15);
      const startTime = minutesToTime(startMinutes);
      const endTime = minutesToTime(Math.min(END_HOUR * 60, endMinutes));

      const newEvent = {
        id: `evt-${Date.now()}`,
        title: 'New Event',
        date: formatDate(startDate),
        endDate: draggingNew.endDay > draggingNew.startDay ? formatDate(endDate) : undefined,
        startTime: startTime,
        endTime: endTime,
        time: `${startTime} - ${endTime}`,
        type: editingType || 'Event',
        calendarId: targetCalendarId,
        recurrence: 'none',
        isAllDay: false, // Drag/click on grid is always a timed event
        isPending: true,
      };

      onEventCreate(newEvent);
      setLastUsedCalendarId(targetCalendarId);
      setDraggingNew(null);
      setDragStartPos(null);
      setEditingEventId(newEvent.id);
      setEditingTitle(newEvent.title);
      setEditingType(newEvent.type);
      setEditingCalendarId(newEvent.calendarId);
      setEditingIsAllDay(false);
    } else if (resizingEvent) {
      const event = events.find(ev => ev.id === resizingEvent.id);
      if (event) {
        const updatedEvent = {
          ...event,
          startTime: resizingEvent.originalStartTime,
          endTime: resizingEvent.originalEndTime,
          time: `${resizingEvent.originalStartTime} - ${resizingEvent.originalEndTime}`,
        };
        onEventUpdate(updatedEvent);
      }
      setResizingEvent(null);
    } else if (movingEvent) {
      const event = events.find(ev => ev.id === movingEvent.id);
      if (event) {
        // Apply final changes based on preview
        // This needs to be calculated in handlePointerMove and stored as preview
        // For now, re-calculate based on final mouse position
        const rect = getGridRect();
        if (!rect) return;
        const columnWidth = getColumnWidth();
        if (columnWidth === 0) return;

        const finalDayIndex = clientXToDayIndex(e.clientX - movingEvent.offsetX);
        const finalTime = clientYToGridTime(e.clientY - movingEvent.offsetY);

        const originalEventDate = parseDate(movingEvent.originalDate);
        const originalDayIndex = diffInDays(originalEventDate, selectedWeekStart);
        const dayChange = finalDayIndex - originalDayIndex;

        const originalStartMinutes = parseTime(movingEvent.originalStartTime);
        const finalStartMinutes = parseTime(finalTime);
        const timeChange = finalStartMinutes - originalStartMinutes;

        const updatedDate = formatDate(addDays(originalEventDate, dayChange));
        const updatedStartTime = minutesToTime(parseTime(event.startTime) + timeChange);
        const updatedEndTime = minutesToTime(parseTime(event.endTime) + timeChange);

        const updatedEvent = {
          ...event,
          date: updatedDate,
          startTime: updatedStartTime,
          endTime: updatedEndTime,
          time: `${updatedStartTime} - ${updatedEndTime}`,
        };
        onEventUpdate(updatedEvent);
      }
      setMovingEvent(null);
    }
    setDragStartPos(null);
    if (capturedElement) {
      capturedElement.releasePointerCapture(e.pointerId);
      setCapturedElement(null);
    }
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, [draggingNew, resizingEvent, movingEvent, events, onEventCreate, onEventUpdate, selectedWeekStart, calendars, editingTitle, editingType, editingCalendarId, editingIsAllDay, setLastUsedCalendarId, setEditingEventId, setEditingTitle, setEditingType, setEditingCalendarId, getGridRect, getColumnWidth, clientXToDayIndex, clientYToGridTime, capturedElement, dragStartPos]);

  const handleEventPointerDown = useCallback((e: React.PointerEvent, event: any) => {
    e.preventDefault();
    // Measure from the block root (e.currentTarget), not the deepest child
    // (e.target) — a pointer down on the title/time/resize-handle would
    // otherwise measure a child box and misdetect edges / misplace the move.
    const block = e.currentTarget as HTMLElement;
    block.setPointerCapture(e.pointerId);

    const rect = block.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;

    const isTopEdge = offsetY < 8;
    const isBottomEdge = offsetY > rect.height - 8;

    if (isTopEdge || isBottomEdge) {
      setResizingEvent({
        id: event.id,
        edge: isTopEdge ? 'top' : 'bottom',
        originalStartTime: event.startTime,
        originalEndTime: event.endTime,
        startY: e.clientY,
      });
    } else {
      setMovingEvent({
        id: event.id,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        originalDate: event.date,
        originalStartTime: event.startTime,
        originalEndTime: event.endTime,
      });
    }
    setCapturedElement(block);
  }, [setResizingEvent, setMovingEvent]);

  return {
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
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleEventPointerDown,
    editingIsAllDay,
    setEditingIsAllDay,
    editingColor,
    setEditingColor
  };
};
