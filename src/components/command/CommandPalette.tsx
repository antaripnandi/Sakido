import React, { useState, useEffect } from 'react';
import { Search, CheckSquare, BookOpen, Timer, CalendarDays, Flame, GraduationCap, Moon, Sun, Plus, ArrowRight, X } from 'lucide-react';
import { NavView, Task, Note, Course } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: NavView) => void;
  tasks: Task[];
  notes: Note[];
  courses: Course[];
  onToggleDarkMode: () => void;
  onQuickAddTask: () => void;
  onQuickAddNote: () => void;
  onStartFocusTimer: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  tasks,
  notes,
  courses,
  onToggleDarkMode,
  onQuickAddTask,
  onQuickAddNote,
  onStartFocusTimer,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(query.toLowerCase()) || t.courseName.toLowerCase().includes(query.toLowerCase()));
  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(query.toLowerCase()) || n.courseName.toLowerCase().includes(query.toLowerCase()));
  const filteredCourses = courses.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.code.toLowerCase().includes(query.toLowerCase()));

  const actions = [
    {
      id: 'action-task',
      label: 'Create New Task',
      category: 'Actions',
      icon: <Plus className="w-4 h-4 text-emerald-500" />,
      run: () => { onQuickAddTask(); onClose(); }
    },
    {
      id: 'action-note',
      label: 'Create New Course Note',
      category: 'Actions',
      icon: <BookOpen className="w-4 h-4 text-indigo-500" />,
      run: () => { onQuickAddNote(); onClose(); }
    },
    {
      id: 'action-focus',
      label: 'Start 25m Focus Session',
      category: 'Actions',
      icon: <Timer className="w-4 h-4 text-amber-500" />,
      run: () => { onStartFocusTimer(); onClose(); }
    },
    {
      id: 'action-darkmode',
      label: 'Toggle Dark/Light Appearance',
      category: 'Actions',
      icon: <Sun className="w-4 h-4 text-amber-400" />,
      run: () => { onToggleDarkMode(); onClose(); }
    },
  ];

  const filteredActions = actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800 gap-3">
          <Search className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search tasks, notes, courses..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-600 dark:placeholder-zinc-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-4">
          {/* Quick Actions */}
          {filteredActions.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                Quick Actions
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredActions.map(act => (
                  <button
                    key={act.id}
                    onClick={act.run}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      {act.icon}
                      <span>{act.label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tasks Results */}
          {filteredTasks.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                Tasks ({filteredTasks.length})
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredTasks.slice(0, 4).map(task => (
                  <button
                    key={task.id}
                    onClick={() => {
                      onNavigate('tasks');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <CheckSquare className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                      <span className="truncate font-medium">{task.title}</span>
                    </div>
                    <span 
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                      style={{ backgroundColor: `${task.courseColor}15`, color: task.courseColor }}
                    >
                      {task.courseName}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes Results */}
          {filteredNotes.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                Course Notes ({filteredNotes.length})
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredNotes.slice(0, 3).map(note => (
                  <button
                    key={note.id}
                    onClick={() => {
                      onNavigate('notes');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                      <span className="truncate font-medium">{note.title}</span>
                    </div>
                    <span className="text-[10px] text-zinc-600">{note.courseName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Shortcuts */}
          <div>
            <div className="px-3 py-1 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
              Jump To Page
            </div>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: <GraduationCap className="w-3.5 h-3.5" /> },
                { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-3.5 h-3.5" /> },
                { id: 'notes', label: 'Notes', icon: <BookOpen className="w-3.5 h-3.5" /> },
                { id: 'focus', label: 'Focus Room', icon: <Timer className="w-3.5 h-3.5" /> },
                { id: 'schedule', label: 'Schedule', icon: <CalendarDays className="w-3.5 h-3.5" /> },
                { id: 'habits', label: 'Habits', icon: <Flame className="w-3.5 h-3.5" /> },
              ].map(page => (
                <button
                  key={page.id}
                  onClick={() => {
                    onNavigate(page.id as NavView);
                    onClose();
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {page.icon}
                  <span>{page.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">↵</kbd> Select</span>
            <span><kbd className="px-1 py-0.5 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">ESC</kbd> Close</span>
          </div>
          <span>Sakido Command Palette</span>
        </div>
      </div>
    </div>
  );
};
