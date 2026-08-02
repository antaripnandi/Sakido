import React from 'react';
import { addDays, formatDate } from './utils/calendarUtils';

interface AllDayRowProps {
  events: any[]; // All-day or multi-day events
  selectedWeekStart: Date;
  calendars: any[];
  visibleCalendars: string[];
  onEventUpdate: (event: any) => void;
  onEditClick: (eventId: string, title: string, type: string, calendarId: string, isAllDay: boolean) => void;
}

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
    if (!visibleCalendars.includes(e.calendarId)) return false;
    // Ensure it's an all-day or multi-day event
    if (!e.isAllDay && !e.endDate) return false;
    // Check if event overlaps with the current week
    const eventStartDate = e.date;
    const eventEndDate = e.endDate || e.date;
    return (eventStartDate <= weekEndStr && eventEndDate >= weekStartStr);
  });

  const [collapsed, setCollapsed] = React.useState(allDayEvents.length === 0);

  // Auto-expand/collapse based on content
  React.useEffect(() => {
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
        onClick={() => setCollapsed(!collapsed)}
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
        <div className="relative grid grid-cols-[80px_repeat(7,_1fr)] min-h-[40px] max-h-[120px] overflow-y-auto" style={{ maxHeight: allDayEvents.length > 0 ? '120px' : '40px' }}>
          <div className="w-20 border-r border-outline-variant/30" /> {/* Empty space for time labels column */}

          {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
            const columnDate = addDays(selectedWeekStart, dayOffset);
            const dateStr = formatDate(columnDate);
            const dayEvents = allDayEvents.filter(event => {
              const eventStartDate = event.date;
              const eventEndDate = event.endDate || event.date;
              // Event spans this column date
              return eventStartDate <= dateStr && eventEndDate >= dateStr;
            });

            return (
              <div key={dayOffset} className="border-r border-outline-variant/20 last:border-r-0 px-1 py-1 min-h-[40px]">
                {dayEvents.map(event => {
                  const color = getCalendarColor(event.calendarId);
                  // Calculate span for the event within the week
                  const eventStartDayIndex = Math.floor((new Date(event.date).getTime() - selectedWeekStart.getTime()) / (1000 * 60 * 60 * 24));
                  const eventEndDayIndex = event.endDate ? Math.floor((new Date(event.endDate).getTime() - selectedWeekStart.getTime()) / (1000 * 60 * 60 * 24)) : eventStartDayIndex;

                  const currentColumnIndex = dayOffset;

                  // Only render the event block once, in its starting column
                  if (currentColumnIndex !== eventStartDayIndex) return null;

                  const spanLength = eventEndDayIndex - eventStartDayIndex + 1;
                  const widthPercentage = Math.min(spanLength, 7 - eventStartDayIndex) / 7 * 100;

                  return (
                    <div
                      key={event.id}
                      className="absolute px-2 py-1 rounded text-xs font-medium truncate mb-1 cursor-pointer hover:shadow-sm transition-shadow"
                      style={{
                        backgroundColor: `${color}`,
                        color: '#fff',
                        left: `${(eventStartDayIndex / 7) * 100}%`,
                        width: `${widthPercentage}%`,
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
            );
          })}
        </div>
      )}
    </div>
  );
};
