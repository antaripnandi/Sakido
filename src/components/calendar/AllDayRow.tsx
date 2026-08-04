import React from 'react';
import { addDays, formatDate, parseDate, diffInDays } from './utils/calendarUtils';

interface AllDayRowProps {
  events: any[]; // All-day or multi-day events
  selectedWeekStart: Date;
  calendars: any[];
  visibleCalendars: string[];
  onEventUpdate: (event: any) => void;
  onEditClick: (eventId: string, title: string, type: string, calendarId: string, isAllDay: boolean) => void;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const AllDayRow: React.FC<AllDayRowProps> = ({
  events,
  selectedWeekStart,
  calendars,
  visibleCalendars,
  onEventUpdate,
  onEditClick
}) => {
  // Filter for all-day or multi-day events in the current week
  const weekStartStr = formatDate(selectedWeekStart);
  const weekEndStr = formatDate(addDays(selectedWeekStart, 6));

  const allDayEvents = events.filter(e => {
    if (e.isPending && !e.isAllDay) return false;
    if (!visibleCalendars.includes(e.calendarId)) return false;
    if (!e.isAllDay) return false;
    // Check if event overlaps with the current week
    const eventStartDate = e.date;
    const eventEndDate = e.endDate || e.date;
    return (eventStartDate <= weekEndStr && eventEndDate >= weekStartStr);
  });

  const [collapsed, setCollapsed] = React.useState(allDayEvents.length === 0);
  // Don't let the auto-expand/collapse effect override a manual toggle.
  const userToggled = React.useRef(false);

  // Auto-expand/collapse based on content (only before the first manual change)
  React.useEffect(() => {
    if (userToggled.current) return;
    setCollapsed(allDayEvents.length === 0);
  }, [allDayEvents.length]);

  const getCalendarColor = (calendarId: string): string => {
    const calendar = calendars.find(c => c.id === calendarId);
    return calendar?.color || '#8b5e3c'; // Default color
  };

  if (allDayEvents.length === 0 && collapsed) return null; // Hide completely if no events and collapsed

  return (
    <div className="border-b border-outline-variant/30">
      <button
        onClick={() => {
          userToggled.current = true;
          setCollapsed(!collapsed);
        }}
        className="flex items-center gap-2 px-4 py-2 text-sm text-secondary hover:bg-surface-container-high/50 w-full transition-colors"
        aria-label={collapsed ? "Expand all-day events" : "Collapse all-day events"}
      >
        {collapsed ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
        All-day ({allDayEvents.length})
      </button>

      {!collapsed && (
        <div className="grid grid-cols-[80px_repeat(7,_1fr)] min-h-[40px] max-h-[120px] overflow-y-auto">
          <div className="w-20 border-r border-outline-variant/30" /> {/* Empty space for time labels column */}
          {/* Events render in a single overlay that starts AFTER the time-label
              column, so left/width percentages are measured against the 7
              columns — not the full grid width (which would shift them left by
              one column). */}
          <div className="col-span-7 relative min-h-[40px]">
            {allDayEvents.map(event => {
              const color = getCalendarColor(event.calendarId);
              // Local-time day math (parseDate, not new Date(date-only string)
              // which is UTC and shifts the index west of UTC), clamped to 0-6.
              const startIndex = clamp(diffInDays(parseDate(event.date), selectedWeekStart), 0, 6);
              const endIndex = clamp(
                diffInDays(parseDate(event.endDate || event.date), selectedWeekStart),
                0, 6
              );
              const span = endIndex - startIndex + 1;

              return (
                <div
                  key={event.id}
                  className="absolute px-2 py-1 rounded text-xs font-medium truncate cursor-pointer hover:shadow-sm transition-shadow"
                  style={{
                    backgroundColor: color,
                    color: '#fff',
                    left: `${(startIndex / 7) * 100}%`,
                    width: `${(span / 7) * 100}%`,
                    top: 4,
                    zIndex: 1
                  }}
                  title={event.title}
                  onClick={() => onEditClick(event.id, event.title, event.type, event.calendarId, event.isAllDay)}
                >
                  {event.title}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
