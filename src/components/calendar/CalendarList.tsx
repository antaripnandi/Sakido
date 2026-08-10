import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';

interface Calendar {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  source: 'sakido' | 'google';
  isDefault?: boolean;
  googleCalendarId?: string;
}

interface CalendarListProps {
  calendars: Calendar[];
  onToggleVisibility: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onCreate: (name: string, color: string) => void;
}

export const CalendarList: React.FC<CalendarListProps> = ({
  calendars,
  onToggleVisibility,
  onRename,
  onDelete,
  onCreate
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newCalName, setNewCalName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const sakidoCalendars = calendars.filter(c => c.source === 'sakido');
  const googleCalendars = calendars.filter(c => c.source === 'google');

  const handleCreate = () => {
    if (newCalName.trim()) {
      const colors = ['#2563eb', '#dc2626', '#059669', '#7c3aed', '#ea580c'];
      const color = colors[sakidoCalendars.length % colors.length];
      onCreate(newCalName.trim(), color);
      setNewCalName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="border-t border-outline-variant/30 pt-4 mt-4">
      <h3 className="text-sm font-bold text-on-surface mb-3 px-2">My Calendars</h3>

      {sakidoCalendars.map(cal => (
        <div key={cal.id} className="flex items-center gap-2 py-2 px-2 hover:bg-surface-container-high/50 rounded transition-colors group">
          <input
            type="checkbox"
            checked={cal.visible}
            onChange={() => onToggleVisibility(cal.id)}
            aria-label={`Toggle ${cal.name} calendar visibility`}
            className="w-4 h-4 cursor-pointer"
          />
          <div
            className="w-4 h-4 rounded-full border border-outline-variant shrink-0"
            style={{ backgroundColor: cal.color }}
          />
          {editingId === cal.id ? (
            <input
              type="text"
              value={cal.name}
              onChange={(e) => onRename(cal.id, e.target.value)}
              onBlur={() => setEditingId(null)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
              aria-label="Calendar name"
              className="flex-1 bg-transparent text-sm outline-none"
              autoFocus
            />
          ) : (
            <span
              className="flex-1 text-sm cursor-pointer"
              onClick={() => setEditingId(cal.id)}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setEditingId(cal.id)}
            >
              {cal.name}
            </span>
          )}
          {!cal.isDefault && !cal.id.startsWith('cal-') && (
            <button
              onClick={() => onDelete(cal.id)}
              aria-label={`Delete ${cal.name} calendar`}
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-error" />
            </button>
          )}
        </div>
      ))}

      {isCreating ? (
        <div className="flex items-center gap-2 py-2 px-2">
          <input
            type="text"
            value={newCalName}
            onChange={(e) => setNewCalName(e.target.value)}
            onBlur={handleCreate}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Calendar name"
            className="flex-1 bg-surface-container-high text-sm px-2 py-1 rounded outline-none"
            autoFocus
          />
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full mt-2 py-2 text-sm text-primary hover:bg-primary/10 rounded transition-colors"
        >
          + Add calendar
        </button>
      )}

      {googleCalendars.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-on-surface mt-6 mb-3 px-2">Google Calendars</h3>
          {googleCalendars.map(cal => (
            <div key={cal.id} className="flex items-center gap-2 py-2 px-2 hover:bg-surface-container-high/50 rounded transition-colors">
              <input
                type="checkbox"
                checked={cal.visible}
                onChange={() => onToggleVisibility(cal.id)}
                className="w-4 h-4 cursor-pointer"
              />
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: cal.color }}
              />
              <span className="flex-1 text-sm">{cal.name}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
