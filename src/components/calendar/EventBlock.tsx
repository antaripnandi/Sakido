import React from 'react';
import { Clock, AlertCircle, Check } from 'lucide-react';

interface EventBlockProps {
  event: any;
  calendarColor: string;
  onPointerDown: (e: React.PointerEvent, event: any) => void;
  onEditClick: (eventId: string, title: string, type: string, calendarId: string, isAllDay: boolean, color?: string) => void;
  top: number;
  height: number;
  isEditing: boolean;
  isBeingDragged: boolean;
  isBeingResized: boolean;
  isAllDay: boolean;
  lane?: number;
  totalLanes?: number;
}

const renderCalendarPriorityBadge = (priority?: string) => {
  if (!priority) return null;
  const p = priority.toLowerCase();
  switch (p) {
    case 'urgent':
      return (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-red-600 text-white shrink-0 uppercase tracking-tight shadow-2xs">
          <AlertCircle className="w-2.5 h-2.5" />
          URGENT
        </span>
      );
    case 'high':
      return (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500 text-black shrink-0 uppercase tracking-tight shadow-2xs">
          HIGH
        </span>
      );
    case 'medium':
    case 'med':
      return (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono font-semibold bg-blue-600 text-white shrink-0 uppercase tracking-tight shadow-2xs">
          MED
        </span>
      );
    case 'low':
      return (
        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono font-medium bg-black/40 text-white/90 border border-white/20 shrink-0 uppercase tracking-tight shadow-2xs">
          LOW
        </span>
      );
    default:
      return null;
  }
};

const renderCalendarStatusBadge = (event: any) => {
  const isDone = event.completed || event.status === 'completed' || event.kanbanStatus === 'done';
  if (isDone) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-600 text-white shrink-0 uppercase tracking-tight shadow-2xs">
        <Check className="w-2.5 h-2.5 text-white" />
        DONE
      </span>
    );
  }
  return renderCalendarPriorityBadge(event.priority);
};

export const EventBlock: React.FC<EventBlockProps> = ({
  event,
  calendarColor,
  onPointerDown,
  onEditClick,
  top,
  height,
  isEditing,
  isBeingDragged,
  isBeingResized,
  isAllDay,
  lane = 0,
  totalLanes = 1
}) => {
  // The browser fires a click after every pointer sequence, including drags and
  // resizes. Track the press position and suppress the editor open when the
  // pointer actually moved (movement threshold > 4px).
  const downPos = React.useRef<{ x: number; y: number } | null>(null);

  const isDone = event.completed || event.status === 'completed' || event.kanbanStatus === 'done';
  const displayColor = isDone ? '#059669' : (event.color || calendarColor);
  const openEditor = () => onEditClick(event.id, event.title, event.type, event.calendarId, event.isAllDay, displayColor);

  const handleClick = (e: React.MouseEvent) => {
    const start = downPos.current;
    downPos.current = null;
    if (!start) return;
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > 4;
    if (moved) return;
    openEditor();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    openEditor();
  };

  const leftPos = totalLanes > 1 ? `${(lane / totalLanes) * 100}%` : '4px';
  const widthPos = totalLanes > 1 ? `${(1 / totalLanes) * 100 - 1}%` : 'calc(100% - 8px)';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${event.title}${event.time ? `, ${event.time}` : ''}`}
      onKeyDown={handleKeyDown}
      className={`absolute rounded px-2 py-1 text-xs border cursor-pointer transition-shadow event-block ${
        isEditing || isBeingDragged || isBeingResized ? 'z-40 shadow-lg' : 'hover:shadow-lg'
      } ${isAllDay ? 'top-0 h-full' : ''} ${isDone ? 'opacity-85' : ''}`}
      style={{
        top: isAllDay ? '0' : `${top}px`,
        height: isAllDay ? '100%' : `${height}px`,
        left: leftPos,
        width: widthPos,
        backgroundColor: displayColor,
        borderColor: isDone ? '#10b981' : displayColor,
        color: '#ffffff'
      }}
      onPointerDown={(e) => {
        downPos.current = { x: e.clientX, y: e.clientY };
        onPointerDown(e, event);
      }}
      onClick={handleClick}
    >
      <div className="flex items-start gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 min-w-0 flex-wrap">
            {renderCalendarStatusBadge(event)}
            <span className={`font-medium truncate ${isDone ? 'line-through opacity-90 font-semibold' : ''}`}>
              {event.title}
            </span>
          </div>
          <div className="text-[10px] opacity-80 font-mono mt-0.5">{event.time}</div>
        </div>
        {event.syncStatus === 'pending' && (
          <Clock className="w-3 h-3 text-yellow-300 flex-shrink-0" aria-label="Sync pending" />
        )}
        {event.syncStatus === 'failed' && (
          <AlertCircle className="w-3 h-3 text-red-300 flex-shrink-0" aria-label="Sync failed" />
        )}
      </div>
      {!isAllDay && <div className="resize-handle-top absolute top-0 left-0 right-0 h-2 cursor-ns-resize"></div>}
      {!isAllDay && <div className="resize-handle-bottom absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize"></div>}
    </div>
  );
};
