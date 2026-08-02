import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MiniMonthPickerProps {
  selectedWeekStart: Date;
  onWeekSelect: (monday: Date) => void;
  onRangeSelect: (startDate: Date, endDate: Date) => void; // New prop for range selection
  events: any[];
  visibleCalendars: string[];
}

export const MiniMonthPicker: React.FC<MiniMonthPickerProps> = ({
  selectedWeekStart,
  onWeekSelect,
  onRangeSelect, // Destructure new prop
  events,
  visibleCalendars
}) => {
  const selectedYear = selectedWeekStart.getFullYear();
  const selectedMonth = selectedWeekStart.getMonth();
  const [currentMonth, setCurrentMonth] = useState(() => new Date(selectedYear, selectedMonth, 1));
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null); // New state for drag start
  const [dragEndDate, setDragEndDate] = useState<Date | null>(null); // New state for drag end

  useEffect(() => {
    setCurrentMonth(new Date(selectedYear, selectedMonth, 1));
  }, [selectedYear, selectedMonth]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const today = new Date();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const buildDateFromDay = (day: number) => new Date(year, month, day);

  const handleDayClick = (day: number) => {
    const clickedDate = buildDateFromDay(day);
    const dayOfWeek = clickedDate.getDay();
    const monday = new Date(clickedDate);
    monday.setDate(day - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    onWeekSelect(monday);
  };

  const handlePointerDown = (day: number) => {
    const date = buildDateFromDay(day);
    setDragStartDate(date);
    setDragEndDate(date); // Initialize drag end date as well
  };

  const handlePointerEnter = (day: number) => {
    if (dragStartDate) {
      setDragEndDate(buildDateFromDay(day));
    }
  };

  const handlePointerUp = () => {
    if (dragStartDate && dragEndDate) {
      // Ensure start date is always before or equal to end date
      const finalStartDate = dragStartDate <= dragEndDate ? dragStartDate : dragEndDate;
      const finalEndDate = dragStartDate <= dragEndDate ? dragEndDate : dragStartDate;
      onRangeSelect(finalStartDate, finalEndDate);
    }
    setDragStartDate(null);
    setDragEndDate(null);
  };

  const isInSelectedWeek = (day: number): boolean => {
    const date = buildDateFromDay(day);
    const dayOfWeek = date.getDay();
    const monday = new Date(date);
    monday.setDate(day - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    return monday.toDateString() === selectedWeekStart.toDateString();
  };

  const isDragging = (day: number): boolean => {
    if (!dragStartDate || !dragEndDate) return false;
    const date = buildDateFromDay(day).getTime();
    const start = dragStartDate.getTime();
    const end = dragEndDate.getTime();
    return (date >= Math.min(start, end) && date <= Math.max(start, end));
  };

  const hasEvents = (day: number): boolean => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.some(e => e.date === dateStr && visibleCalendars.includes(e.calendarId));
  };

  return (
    <div className="bg-surface-container-low rounded-xl border border-outline-variant/30 p-3">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          aria-label="Previous month"
          onClick={handlePrevMonth}
          className="p-1 hover:bg-surface-container-high rounded transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-display font-semibold text-sm text-on-surface">
          {monthName}
        </span>
        <button
          type="button"
          aria-label="Next month"
          onClick={handleNextMonth}
          className="p-1 hover:bg-surface-container-high rounded transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono text-secondary uppercase mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1" onPointerUp={handlePointerUp}>
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`pad-${i}`} className="h-8" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
          const inWeek = isInSelectedWeek(day);
          const hasDot = hasEvents(day);
          const dragging = isDragging(day); // Check if this day is part of the drag selection

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDayClick(day)}
              onPointerDown={() => handlePointerDown(day)}
              onPointerEnter={() => handlePointerEnter(day)}
              className={`h-8 rounded text-xs font-medium relative transition-all ${
                isToday
                  ? 'ring-2 ring-primary bg-primary/10 text-primary'
                  : inWeek
                  ? 'bg-surface-container-high text-on-surface'
                  : dragging
                  ? 'bg-primary/20 text-primary' // Style for dragging days
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {day}
              {hasDot && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
