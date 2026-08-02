import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MiniMonthPickerProps {
  selectedWeekStart: Date;
  onWeekSelect: (monday: Date) => void;
  events: any[];
  visibleCalendars: string[];
}

export const MiniMonthPicker: React.FC<MiniMonthPickerProps> = ({
  selectedWeekStart,
  onWeekSelect,
  events,
  visibleCalendars
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const today = new Date();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(year, month, day);
    const dayOfWeek = clickedDate.getDay();
    const monday = new Date(clickedDate);
    monday.setDate(day - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    onWeekSelect(monday);
  };

  const isInSelectedWeek = (day: number): boolean => {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const monday = new Date(date);
    monday.setDate(day - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    return monday.toDateString() === selectedWeekStart.toDateString();
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

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`pad-${i}`} className="h-8" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
          const inWeek = isInSelectedWeek(day);
          const hasDot = hasEvents(day);

          return (
            <button
              key={day}
              onClick={() => handleDayClick(day)}
              className={`h-8 rounded text-xs font-medium relative transition-all ${
                isToday
                  ? 'ring-2 ring-primary bg-primary/10 text-primary'
                  : inWeek
                  ? 'bg-surface-container-high text-on-surface'
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
