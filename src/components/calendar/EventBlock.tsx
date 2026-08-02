import React from 'react';

interface EventBlockProps {
  event: any;
  calendarColor: string;
  onPointerDown: (e: React.PointerEvent, event: any) => void;
  onEditClick: (eventId: string, title: string, type: string, calendarId: string) => void;
}

export const EventBlock: React.FC<EventBlockProps> = ({
  event,
  calendarColor,
  onPointerDown,
  onEditClick,
}) => {
  return (
    <div
      key={event.id}
      className="absolute left-1 right-1 rounded px-2 py-1 text-xs border cursor-pointer hover:shadow-lg transition-shadow event-block"
      style={{
        top: `${event.top}px`,
        height: `${event.height}px`,
        backgroundColor: `${calendarColor}20`,
        borderColor: calendarColor,
        color: 'inherit'
      }}
      onPointerDown={(e) => onPointerDown(e, event)}
      onClick={() => onEditClick(event.id, event.title, event.type, event.calendarId)}
    >
      <div className="font-medium truncate">{event.title}</div>
      <div className="text-[10px] opacity-70">{event.time}</div>
      <div className="resize-handle-top absolute top-0 left-0 right-0 h-2 cursor-ns-resize"></div>
      <div className="resize-handle-bottom absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize"></div>
    </div>
  );
};
