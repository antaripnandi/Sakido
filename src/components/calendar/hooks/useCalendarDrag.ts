import React, { useState, useRef, useCallback, useEffect } from 'react';
import { parseTime, minutesToTime, snapToQuarter, clientYToTime, addDays, formatDate } from '../utils/calendarUtils';

const SLOT_H = 52; // Height of each hourly slot (52px/hour)
const START_HOUR = 7; // Start hour of the grid (7 AM)
const END_HOUR = 22; // End hour of the grid (10 PM)
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
}

export const useCalendarDrag = (
  gridRef: React.RefObject<HTMLDivElement>,
  selectedWeekStart: Date,
  events: any[],
  setEvents: React.Dispatch<React.SetStateAction<any[]>>,
  onEventCreate: (event: any) => void,
  onEventUpdate: (event: any) => void,
  getCalendarColor: (calendarId: string) => string,
  lastUsedCalendarId: string,
  calendars: any[],
  setLastUsedCalendarId: React.Dispatch<React.SetStateAction<string>>,
  syncEventToGoogleCalendar: (event: any) => void // Add this parameter
) => {
  const [draggingNew, setDraggingNew] = useState<DraggingNewState | null>(null);
  const [resizingEvent, setResizingEvent] = useState<ResizingEventState | null>(null);
  const [movingEvent, setMovingEvent] = useState<MovingEventState | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingType, setEditingType] = useState('Event');
  const [editingCalendarId, setEditingCalendarId] = useState<string>(lastUsedCalendarId);

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
    const rect = getGridRect();
    if (!rect) return minutesToTime(START_HOUR * 60);

    const offsetPx = clientY - rect.top;
    const minutesFromTop = (offsetPx / SLOT_H) * 60;
    const snappedMinutes = snapToQuarter(minutesFromTop + START_HOUR * 60);
    return minutesToTime(Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, snappedMinutes)));
  }, [getGridRect]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.event-block') || !gridRef.current) return; // Ignore if clicking on an event

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = getGridRect();
    if (!rect) return;

    const startTime = clientYToGridTime(e.clientY);
    const startDay = clientXToDay(e.clientX);
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
  }, [gridRef, getGridRect, clientYToGridTime, clientXToDay, selectedWeekStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!gridRef.current) return;

    if (draggingNew) {
      const currentTime = clientYToGridTime(e.clientY);
      const currentDay = clientXToDay(e.clientX);

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
        const event = events.find(ev => ev.id === prev.id);
        if (!event) return null;

        if (prev.edge === 'top') {
          return { ...prev, originalStartTime: currentTime };
        } else {
          return { ...prev, originalEndTime: currentTime };
        }
      });
    } else if (movingEvent) {
      const rect = getGridRect();
      if (!rect) return;
      const columnWidth = getColumnWidth();
      if (columnWidth === 0) return;

      const newDayIndex = clientXToDay(e.clientX - movingEvent.offsetX);
      const newTime = clientYToGridTime(e.clientY - movingEvent.offsetY);

      // Preview update - actual update on pointerUp
      const eventToMove = events.find(ev => ev.id === movingEvent.id);
      if (eventToMove) {
        // Calculate day change
        const originalDayIndex = Math.floor((new Date(eventToMove.date).getTime() - selectedWeekStart.getTime()) / (1000 * 60 * 60 * 24));
        const dayChange = newDayIndex - originalDayIndex;

        // Calculate time change
        const originalStartMinutes = parseTime(eventToMove.originalStartTime || eventToMove.startTime);
        const newStartMinutes = parseTime(newTime);
        const timeChange = newStartMinutes - originalStartMinutes;

        // Apply changes for preview
        const previewDate = formatDate(addDays(new Date(eventToMove.date), dayChange));
        const previewStartTime = minutesToTime(parseTime(eventToMove.startTime) + timeChange);
        const previewEndTime = minutesToTime(parseTime(eventToMove.endTime) + timeChange);

        // TODO: Update some preview state here
      }
    }
  }, [draggingNew, resizingEvent, movingEvent, events, getGridRect, getColumnWidth, clientYToGridTime, clientXToDay, selectedWeekStart]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (draggingNew) {
      const startDate = addDays(selectedWeekStart, draggingNew.startDay);
      const endDate = addDays(selectedWeekStart, draggingNew.endDay);

      const defaultCalendar = calendars.find(c => c.isDefault) || calendars[0];
      const targetCalendarId = editingCalendarId || defaultCalendar?.id;

      const newEvent = {
        id: `evt-${Date.now()}`,
        title: editingTitle.trim() || 'New Event',
        date: formatDate(startDate),
        endDate: draggingNew.endDay > draggingNew.startDay ? formatDate(endDate) : undefined,
        startTime: draggingNew.startTime,
        endTime: draggingNew.endTime,
        time: `${draggingNew.startTime} - ${draggingNew.endTime}`,
        type: editingType,
        calendarId: targetCalendarId,
        recurrence: 'none',
        isAllDay: false,
      };

      onEventCreate(newEvent);
      setLastUsedCalendarId(targetCalendarId);
      setDraggingNew(null);
      setEditingEventId(newEvent.id); // Open editor for new event
      setEditingTitle(newEvent.title);
      setEditingType(newEvent.type);
      setEditingCalendarId(newEvent.calendarId);
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

        const finalDayIndex = clientXToDay(e.clientX - movingEvent.offsetX);
        const finalTime = clientYToGridTime(e.clientY - movingEvent.offsetY);

        const originalEventDate = new Date(event.originalDate || event.date);
        const originalDayIndex = Math.floor((originalEventDate.getTime() - selectedWeekStart.getTime()) / (1000 * 60 * 60 * 24));
        const dayChange = finalDayIndex - originalDayIndex;

        const originalStartMinutes = parseTime(event.originalStartTime || event.startTime);
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
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, [draggingNew, resizingEvent, movingEvent, events, onEventCreate, onEventUpdate, selectedWeekStart, calendars, editingTitle, editingType, editingCalendarId, setLastUsedCalendarId, setEditingEventId, setEditingTitle, setEditingType, setEditingCalendarId, getGridRect, getColumnWidth, clientXToDayIndex, clientYToGridTime, syncEventToGoogleCalendar]);

  const handleEventPointerDown = useCallback((e: React.PointerEvent, event: any) => {
    const target = e.target as HTMLElement;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = target.getBoundingClientRect();
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
  };
};
