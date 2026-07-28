import React from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  BookOpen, 
  Timer, 
  CalendarDays, 
  Flame, 
  GraduationCap, 
  Layers,
  Command, 
  Sun, 
  Moon, 
  ChevronRight,
  Plus
} from 'lucide-react';
import { NavView, Course } from '../../types';

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  courses: Course[];
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenCommand: () => void;
  onQuickAddTask: () => void;
  activeFocusTime?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  courses,
  darkMode,
  onToggleDarkMode,
  onOpenCommand,
  onQuickAddTask,
  activeFocusTime,
}) => {
  const mainNavItems: { id: NavView; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'tasks', label: 'Tasks & Homework', icon: <CheckSquare className="w-4 h-4" />, badge: '5' },
    { id: 'notes', label: 'Course Notes', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'flashcards', label: 'Flashcards', icon: <Layers className="w-4 h-4" /> },
    { id: 'focus', label: 'Focus Mode', icon: <Timer className="w-4 h-4" />, badge: activeFocusTime },
    { id: 'schedule', label: 'Class Schedule', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'habits', label: 'Habit Tracker', icon: <Flame className="w-4 h-4" /> },
    { id: 'courses', label: 'My Courses', icon: <GraduationCap className="w-4 h-4" />, badge: `${courses.length}` },
  ];

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col justify-between h-screen border-r border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/80 backdrop-blur-md select-none transition-colors duration-200">
      <div className="flex flex-col flex-1 overflow-y-auto px-3.5 py-4">
        {/* Sakido Brand Header */}
        <div className="flex items-center justify-between px-2 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-zinc-900 font-bold text-sm shadow-sm tracking-tighter">
              咲
            </div>
            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight text-base flex items-center gap-1.5">
                Sakido
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                  v1.0
                </span>
              </span>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">Stanford • Fall '26</p>
            </div>
          </div>
        </div>

        {/* Quick Add & Command Shortcut */}
        <div className="flex items-center gap-2 mb-5 px-1">
          <button
            onClick={onQuickAddTask}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            New Task
          </button>

          <button
            onClick={onOpenCommand}
            title="Command Palette (Cmd+K)"
            className="flex items-center justify-center p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Command className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Main Navigation */}
        <div className="space-y-1 mb-6">
          <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Workspace
          </div>
          {mainNavItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-zinc-100 dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-50 font-semibold shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      item.id === 'focus' && activeFocusTime
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 animate-pulse'
                        : isActive
                        ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Course Quick List */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-2 pb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Enrolled Courses
            </span>
            <button
              onClick={() => onNavigate('courses')}
              className="text-[11px] text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            >
              View all
            </button>
          </div>
          {courses.slice(0, 4).map((course) => (
            <button
              key={course.id}
              onClick={() => onNavigate('courses')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: course.color }}
                />
                <span className="truncate font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">
                  {course.code}
                </span>
              </div>
              <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
                {course.currentGrade}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer Profile & Theme toggle */}
      <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              alt="Alex Rivera"
              className="w-7 h-7 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
            />
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full ring-1 ring-white dark:ring-zinc-900" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">Alex Rivera</p>
            <p className="text-[10px] text-zinc-600 dark:text-zinc-400 truncate">CS & Math '27</p>
          </div>
        </div>

        <button
          onClick={onToggleDarkMode}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
        </button>
      </div>
    </aside>
  );
};
