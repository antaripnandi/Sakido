import React from 'react';
import { Check } from 'lucide-react';
import { addDays, formatDate, parseDate, diffInDays } from './utils/calendarUtils';

interface AllDayRowProps {
  events: any[]; // All-day or multi-day events
  selectedWeekStart: Date;
  calendars: any[];
  visibleCalendars: string[];
  onEventUpdate: (event: any) => void;
  onEditClick: (eventId: string, title: string, type: string, calendarId: string, isAllDay: boolean, color?: string) => void;
  daysToShow?: number;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const AllDayRow: React.FC<AllDayRowProps> = ({
  events,
  selectedWeekStart,
  calendars,
  visibleCalendars,
  onEventUpdate,
  onEditClick,
  daysToShow = 7,
}) => {
  // Filter for all-day or multi-day events in the current view
  const weekStartStr = formatDate(selectedWeekStart);
  const weekEndStr = formatDate(addDays(selectedWeekStart, daysToShow - 1));

  const allDayEvents = events.filter(e => {
    if (e.isPending && !e.isAllDay) return false;
    if (!visibleCalendars.includes(e.calendarId)) return false;
    if (!e.isAllDay) return false;
    // Check if event overlaps with the current view
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
        <div className={`grid ${daysToShow === 1 ? 'grid-cols-[80px_1fr]' : 'grid-cols-[80px_repeat(7,_1fr)]'} min-h-[40px] max-h-[120px] overflow-y-auto`}>
          <div className="w-20 border-r border-outline-variant/30" /> {/* Empty space for time labels column */}
          <div className={`${daysToShow === 1 ? 'col-span-1' : 'col-span-7'} relative min-h-[40px]`}>
            {allDayEvents.map(event => {
              const color = event.color || getCalendarColor(event.calendarId);
              const startIndex = clamp(diffInDays(parseDate(event.date), selectedWeekStart), 0, daysToShow - 1);
              const endIndex = clamp(
                diffInDays(parseDate(event.endDate || event.date), selectedWeekStart),
                0, daysToShow - 1
              );
              const span = endIndex - startIndex + 1;

              const isDone = event.completed || event.status === 'completed' || event.kanbanStatus === 'done';
              const displayColor = isDone ? '#059669' : color;

              return (
                <div
                  key={event.id}
                  className={`absolute px-2.5 py-1 rounded text-xs font-medium truncate cursor-pointer hover:shadow-sm transition-shadow flex items-center gap-1 ${isDone ? 'opacity-85' : ''}`}
                  style={{
                    backgroundColor: displayColor,
                    color: '#fff',
                    left: `${(startIndex / daysToShow) * 100}%`,
                    width: `${(span / daysToShow) * 100}%`,
                    top: 4,
                    zIndex: 1
                  }}
                  title={event.title}
                  onClick={() => onEditClick(event.id, event.title, event.type, event.calendarId, event.isAllDay, displayColor)}
                >
                  {isDone ? (
                    <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-600 text-white shrink-0 uppercase flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> DONE
                    </span>
                  ) : (
                    <>
                      {event.priority === 'urgent' && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-red-600 text-white shrink-0 uppercase">
                          URGENT
                        </span>
                      )}
                      {event.priority === 'high' && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500 text-black shrink-0 uppercase">
                          HIGH
                        </span>
                      )}
                      {event.priority === 'medium' && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-mono font-semibold bg-blue-600 text-white shrink-0 uppercase">
                          MED
                        </span>
                      )}
                      {event.priority === 'low' && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-mono font-medium bg-black/40 text-white/90 shrink-0 uppercase">
                          LOW
                        </span>
                      )}
                    </>
                  )}
                  <span className={`truncate ${isDone ? 'line-through opacity-90' : ''}`}>{event.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
