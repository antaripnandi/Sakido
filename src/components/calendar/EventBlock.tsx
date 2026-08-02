import React from 'react';

interface EventBlockProps {
  event: any;
  calendarColor: string;
  onPointerDown: (e: React.PointerEvent, event: any) => void;
  onEditClick: (eventId: string, title: string, type: string, calendarId: string, isAllDay: boolean) => void;
  top: number;
  height: number;
  isEditing: boolean;
  isBeingDragged: boolean;
  isBeingResized: boolean;
  isAllDay: boolean;
}

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
  isAllDay
}) => {
  // The browser fires a click after every pointer sequence, including drags and
  // resizes. Track the press position and suppress the editor open when the
  // pointer actually moved (movement threshold > 4px).
  const downPos = React.useRef<{ x: number; y: number } | null>(null);

  const openEditor = () => onEditClick(event.id, event.title, event.type, event.calendarId, event.isAllDay);

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

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${event.title}${event.time ? `, ${event.time}` : ''}`}
      onKeyDown={handleKeyDown}
      className={`absolute left-1 right-1 rounded px-2 py-1 text-xs border cursor-pointer transition-shadow event-block ${
        isEditing || isBeingDragged || isBeingResized ? 'z-40 shadow-lg' : 'hover:shadow-lg'
      } ${isAllDay ? 'top-0 h-full' : ''}`}
      style={{
        top: isAllDay ? '0' : `${top}px`,
        height: isAllDay ? '100%' : `${height}px`,
        backgroundColor: `${calendarColor}20`,
        borderColor: calendarColor,
        color: 'inherit'
      }}
      onPointerDown={(e) => {
        downPos.current = { x: e.clientX, y: e.clientY };
        onPointerDown(e, event);
      }}
      onClick={handleClick}
    >
      <div className="font-medium truncate">{event.title}</div>
      <div className="text-[10px] opacity-70">{event.time}</div>
      {!isAllDay && <div className="resize-handle-top absolute top-0 left-0 right-0 h-2 cursor-ns-resize"></div>}
      {!isAllDay && <div className="resize-handle-bottom absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize"></div>}
    </div>
  );
};
