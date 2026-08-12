import React, { useState, useMemo } from 'react';
import { 
  Timer, 
  CheckSquare, 
  Flame, 
  Clock, 
  MapPin, 
  Plus, 
  Check, 
  ChevronRight,
  BookOpen,
  Sparkles,
  Zap,
  TrendingUp,
  AlertTriangle,
  Calendar as CalendarIcon,
  Filter,
  ArrowRight,
  FileText
} from 'lucide-react';
import { Task, Course, ScheduleEvent, UserProfile, NavView } from '../../types';
import { safeCreateDateTime } from '../../lib/dateUtils';

interface DashboardViewProps {
  profile: UserProfile;
  tasks: Task[];
  courses: Course[];
  schedule: ScheduleEvent[];
  onNavigate: (view: NavView) => void;
  onToggleTaskStatus: (taskId: string) => void;
  onStartFocusWithTask: (taskTitle?: string) => void;
  onQuickAddTask: () => void;
}

type StatusFilter = 'all' | 'upcoming' | 'due-soon' | 'overdue' | 'completed';

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  tasks,
  courses,
  schedule,
  onNavigate,
  onToggleTaskStatus,
  onStartFocusWithTask,
  onQuickAddTask,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<number>(new Date().getDate());

  // Helper to calculate status accurately by comparing ISO dates
  const { now, todayStr } = useMemo(() => {
    const n = new Date();
    return { now: n, todayStr: n.toISOString().split('T')[0] };
  }, []);

  const getTaskCalculatedStatus = (t: Task): 'upcoming' | 'due-soon' | 'overdue' | 'completed' => {
    if (t.status === 'completed' || t.status === 'submitted' || t.completed) return 'completed';
    if (!t.dueDate || t.dueDate === 'Upcoming') return 'upcoming';
    const dueStr = t.dueDate.split('T')[0];
    if (dueStr < todayStr) return 'overdue';

    const todayMs = new Date(todayStr).getTime();
    const dueMs = new Date(t.dueDate).setHours(0, 0, 0, 0);
    if (!isNaN(dueMs)) {
      const diffDays = Math.ceil((dueMs - todayMs) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 2) return 'due-soon';
    }
    return 'upcoming';
  };

  const isScheduleEventPast = (s: any): boolean => {
    let eventDateStr = s.date;

    if (!eventDateStr && typeof s.dayOfWeek === 'number') {
      const todayDay = now.getDay();
      if (s.dayOfWeek < todayDay) return true;
      if (s.dayOfWeek > todayDay) return false;
      eventDateStr = todayStr;
    }

    if (!eventDateStr) return false;

    const dateOnlyStr = eventDateStr.split('T')[0];
    if (dateOnlyStr < todayStr) return true;
    if (dateOnlyStr > todayStr) return false;

    let endTimeStr = s.endTime;
    if (!endTimeStr && s.time && s.time.includes('-')) {
      endTimeStr = s.time.split('-')[1]?.trim();
    }
    if (!endTimeStr) {
      endTimeStr = s.startTime || s.time || '23:59';
    }

    const timeMatch = endTimeStr.match(/(\d{1,2}):(\d{2})/);
    if (!timeMatch) return false;

    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);

    const endDateTime = new Date(dateOnlyStr);
    if (isNaN(endDateTime.getTime())) return false;

    endDateTime.setHours(hours, minutes, 59, 999);
    return now.getTime() > endDateTime.getTime();
  };

  const urgentTasks = useMemo(
    () => tasks.filter((t) => getTaskCalculatedStatus(t) !== 'completed'),
    [tasks, todayStr]
  );

  // Categorize real tasks for metrics
  const overdueCount = useMemo(
    () => tasks.filter((t) => getTaskCalculatedStatus(t) === 'overdue').length,
    [tasks, todayStr]
  );
  const dueSoonCount = useMemo(
    () => tasks.filter((t) => getTaskCalculatedStatus(t) === 'due-soon').length,
    [tasks, todayStr]
  );

  // Next upcoming event with time remaining
  const nextUpcoming = useMemo(() => {
    const upcoming = [...tasks, ...schedule]
      .filter(item => {
        if ('completed' in item && item.completed) return false;
        if ('status' in item && (item.status === 'completed' || item.status === 'submitted')) return false;
        return true;
      })
      .map(item => {
        const isTask = 'dueDate' in item;
        const dateStr = isTask ? item.dueDate : (item as any).date;
        if (!dateStr || dateStr === 'Upcoming') return null;

        const rawDateOnly = dateStr.split('T')[0];
        const itemDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDateOnly)
          ? (safeCreateDateTime(rawDateOnly, '00:00') || new Date(dateStr))
          : new Date(dateStr);
        if (isNaN(itemDate.getTime())) return null;

        const timeStr = isTask ? '' : ((item as any).startTime || '09:00');
        if (timeStr && !isTask) {
          const [h, m] = timeStr.split(':').map(Number);
          itemDate.setHours(h, m, 0, 0);
        }

        const msUntil = itemDate.getTime() - now.getTime();
        if (msUntil < 0) return null;

        return {
          title: isTask ? (item as Task).title : ((item as any).title || (item as any).courseName),
          type: isTask ? 'task' : ((item as any).type === 'exam' ? 'exam' : 'lecture'),
          courseName: isTask ? (item as Task).courseName : ((item as any).courseCode || 'Event'),
          dateTime: itemDate,
          msUntil,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.msUntil - b.msUntil)[0];

    return upcoming;
  }, [tasks, schedule, now]);

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `in ${minutes} min`;
    return 'now';
  };

  // Combine real tasks & schedule events into unified list
  const unifiedAcademicItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      courseName: string;
      courseColor?: string;
      type: 'task' | 'exam' | 'lecture';
      dueDate: string;
      status: 'upcoming' | 'due-soon' | 'overdue' | 'completed';
      priority?: string;
      rawObject: Task | ScheduleEvent;
    }> = [];

    // Add Tasks
    tasks.forEach(t => {
      const status = getTaskCalculatedStatus(t);

      items.push({
        id: `task-${t.id}`,
        title: t.title,
        courseName: t.courseName,
        courseColor: t.courseColor,
        type: 'task',
        dueDate: t.dueDate,
        status,
        priority: t.priority,
        rawObject: t,
      });
    });

    // Add Exams & Lectures from Schedule (including live Google Calendar events)
    schedule.forEach((s: any) => {
      // Filter out events whose time period has already passed from Overview
      if (isScheduleEventPast(s)) return;

      const isGCal = s.id?.toString().startsWith('gcal-') || s.type === 'Google Cal';
      const eventTitle = s.title || s.summary || (s.type === 'exam' ? `EXAM: ${s.courseName}` : s.courseName || 'Calendar Event');
      const eventCourse = s.courseCode || (isGCal ? 'GCal' : 'Lecture');
      const eventColor = s.color || s.courseColor || (isGCal ? '#4285f4' : '#8b5e3c');
      const eventTime = s.date
        ? `${s.date}${s.time ? ` (${s.time})` : s.startTime ? ` (${s.startTime} - ${s.endTime})` : ''}`
        : `${s.startTime || '09:00'} - ${s.endTime || '10:00'}`;

      items.push({
        id: `schedule-${s.id}`,
        title: eventTitle,
        courseName: eventCourse,
        courseColor: eventColor,
        type: s.type === 'exam' ? 'exam' : 'lecture',
        dueDate: eventTime,
        status: s.type === 'exam' ? 'due-soon' : 'upcoming',
        rawObject: s,
      });
    });

    return items;
  }, [tasks, schedule, todayStr, now]);

  // Filtered Items for Main View
  const filteredAcademicItems = useMemo(() => {
    return unifiedAcademicItems.filter(item => {
      if (selectedCourse !== 'all' && item.courseName !== selectedCourse && !item.title.includes(selectedCourse)) {
        return false;
      }
      if (statusFilter === 'all') return true;
      if (statusFilter === 'completed') return item.status === 'completed';
      if (statusFilter === 'overdue') return item.status === 'overdue';
      if (statusFilter === 'due-soon') return item.status === 'due-soon';
      if (statusFilter === 'upcoming') return item.status === 'upcoming';
      return true;
    });
  }, [unifiedAcademicItems, statusFilter, selectedCourse]);

  const completedMinutesToday = profile?.completedMinutesToday || 0;
  const dailyGoalMinutes = profile?.dailyGoalMinutes || 60;
  const progressPercent = Math.min(100, Math.round((completedMinutesToday / dailyGoalMinutes) * 100));
  const streakDays = profile?.streakDays || 0;

  // DYNAMIC Compact Calendar Days Generator (Computed 100% from REAL user schedule & tasks with firstDay offset)
  const currentMonthDays = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    // Set of real task due dates
    const taskDays = new Set<number>();
    tasks.forEach(t => {
      if (t.dueDate) {
        const d = new Date(t.dueDate);
        if (!isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year) {
          taskDays.add(d.getDate());
        }
      }
    });

    // Set of real exam dates
    const examDays = new Set<number>();
    schedule.forEach(s => {
      if (s.date) {
        const d = new Date(s.date);
        if (!isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year && s.type === 'exam') {
          examDays.add(d.getDate());
        }
      }
    });

    const daysArr: Array<{ day: number | null; hasTask: boolean; hasExam: boolean }> = [];
    for (let p = 0; p < firstDayOfMonth; p++) {
      daysArr.push({ day: null, hasTask: false, hasExam: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      daysArr.push({
        day: d,
        hasTask: taskDays.has(d),
        hasExam: examDays.has(d),
      });
    }
    return daysArr;
  }, [tasks, schedule]);

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 text-on-surface font-sans">
      {/* Left Column (Main Content) */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        {/* Stats Row (4 Columns) */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Due This Week */}
          <div className="p-4 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#120e0b] shadow-2xs flex flex-col justify-between h-28">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider font-mono">
              Due This Week
            </span>
            <span className="font-sans font-bold text-2xl sm:text-3xl tracking-tight text-on-surface tabular-nums">
              {urgentTasks.length}
            </span>
          </div>

          {/* Urgent */}
          <div className="p-4 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#120e0b] shadow-2xs flex flex-col justify-between h-28">
            <span className="text-[11px] font-bold text-error uppercase tracking-wider font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-error shrink-0" /> Urgent
            </span>
            <span className="font-sans font-bold text-2xl sm:text-3xl tracking-tight text-on-surface tabular-nums">
              {overdueCount}
            </span>
          </div>

          {/* Daily Focus */}
          <div className="p-4 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#120e0b] shadow-2xs flex flex-col justify-between h-28">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider font-mono">
              Daily Focus
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-sans font-bold text-2xl sm:text-3xl tracking-tight text-on-surface tabular-nums">
                {completedMinutesToday}
              </span>
              <span className="font-sans text-xs text-secondary font-semibold">mins</span>
            </div>
          </div>

          {/* Streak */}
          <div className="p-4 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#120e0b] shadow-2xs flex flex-col justify-between h-28">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider font-mono">
              Streak
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-sans font-bold text-2xl sm:text-3xl tracking-tight text-on-surface tabular-nums">
                {streakDays}
              </span>
              <Flame className="w-5 h-5 text-amber-500 fill-amber-500/20 stroke-[2] shrink-0" />
            </div>
          </div>
        </section>

        {/* Tasks Panel */}
        <section className="flex-1 flex flex-col min-h-0 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#120e0b] overflow-hidden shadow-2xs">
          {/* Panel Header */}
          <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low dark:bg-[#1c1613]">
            <h2 className="font-display text-lg font-bold text-on-surface">
              Tasks &amp; Assignments ({filteredAcademicItems.length})
            </h2>
            <button
              type="button"
              onClick={onQuickAddTask}
              className="bg-primary hover:opacity-90 text-on-primary px-3 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>

          {/* Filter Pills */}
          <div className="px-4 py-2 border-b border-outline-variant/20 flex gap-4 bg-surface-container-low/50 overflow-x-auto shrink-0 no-scrollbar">
            {(['all', 'upcoming', 'due-soon', 'overdue', 'completed'] as StatusFilter[]).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`text-xs font-semibold capitalize tracking-wide pb-1 transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'text-primary font-bold border-b-2 border-primary'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                {st.replace('-', ' ')}
              </button>
            ))}
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {filteredAcademicItems.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-low/60 flex flex-col items-center justify-center gap-3">
                <CheckSquare className="w-6 h-6 text-secondary" />
                <p className="text-xs text-secondary">No upcoming tasks due</p>
                <button
                  onClick={onQuickAddTask}
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:opacity-90 shadow-2xs cursor-pointer"
                >
                  + Add Task
                </button>
              </div>
            ) : (
              filteredAcademicItems.map(item => {
                const isTask = item.type === 'task';
                const taskObj = isTask ? (item.rawObject as Task) : null;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-outline-variant/30 bg-surface-container-low/40 dark:bg-[#1c1613]/50 hover:border-outline-variant/80 transition-all flex gap-3.5 items-start group shadow-2xs"
                  >
                    {isTask && taskObj ? (
                      <input
                        type="checkbox"
                        checked={taskObj.status === 'completed'}
                        onChange={() => onToggleTaskStatus(taskObj.id)}
                        className="mt-1 rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                    ) : (
                      <div className="mt-1 w-4 h-4 rounded bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                        <BookOpen className="w-3 h-3" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className={`text-sm font-semibold text-on-surface truncate pr-2 ${item.status === 'completed' ? 'line-through text-secondary' : ''}`}>
                          {item.title}
                        </h3>
                        <span className={`font-mono text-xs shrink-0 ${item.status === 'overdue' ? 'text-error font-bold' : 'text-secondary'}`}>
                          {item.dueDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs text-secondary">
                        <span>{item.courseName}</span>
                        <span className="w-1 h-1 rounded-full bg-outline-variant" />
                        {item.status === 'overdue' ? (
                          <span className="text-error font-semibold flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> High Priority
                          </span>
                        ) : (
                          <span>{item.priority || 'Medium'} Priority</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Right Column (Sidebar) w-[280px] shrink-0 */}
      <div className="w-full lg:w-[280px] shrink-0 flex flex-col gap-4">
        {/* Digital Clock Card */}
        <div className="rounded-2xl border border-outline-variant/40 p-4 bg-surface-container-lowest dark:bg-[#120e0b] flex items-center justify-between shadow-2xs">
          <div>
            <div className="font-display text-xl font-bold text-on-surface mb-0.5">
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="font-mono text-xs text-secondary">
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <Clock className="w-7 h-7 text-secondary/60" />
        </div>

        {/* Mini Calendar Card */}
        <div className="rounded-2xl border border-outline-variant/40 p-4 bg-surface-container-lowest dark:bg-[#120e0b] shadow-2xs">
          <div className="flex justify-between items-center mb-3">
            <span className="font-mono text-xs font-bold text-on-surface tracking-wider uppercase">
              {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onNavigate('calendar')}
                className="p-1 rounded-lg hover:bg-surface-container text-secondary hover:text-on-surface transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-secondary font-bold mb-1">
            <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs">
            {currentMonthDays.map((d, idx) => {
              if (d.day === null) return <div key={`pad-${idx}`} className="py-1" />;
              const isToday = d.day === now.getDate();
              return (
                <div
                  key={`day-${d.day}`}
                  onClick={() => onNavigate('calendar')}
                  className={`py-1 rounded-lg cursor-pointer transition-colors relative ${
                    isToday
                      ? 'bg-primary text-on-primary font-bold shadow-2xs'
                      : 'hover:bg-surface-container text-on-surface'
                  }`}
                >
                  {d.day}
                  {(d.hasTask || d.hasExam) && !isToday && (
                    <span className="w-1 h-1 rounded-full bg-primary absolute bottom-0.5 left-1/2 -translate-x-1/2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Enrolled Courses Card */}
        <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#120e0b] overflow-hidden flex-1 flex flex-col min-h-0 shadow-2xs">
          <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low dark:bg-[#1c1613] shrink-0">
            <h2 className="font-display text-sm font-bold text-on-surface">Courses</h2>
            <button
              type="button"
              onClick={() => onNavigate('classes')}
              className="font-mono text-xs text-secondary hover:text-primary border-b border-transparent hover:border-primary transition-colors cursor-pointer"
            >
              Manage
            </button>
          </div>

          <div className="p-3 flex flex-col gap-2 overflow-y-auto">
            {courses.length === 0 ? (
              <div className="p-4 text-center text-xs text-secondary font-mono">
                No courses enrolled
              </div>
            ) : (
              courses.slice(0, 4).map(course => (
                <div
                  key={course.id}
                  onClick={() => onNavigate('classes')}
                  className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-low/30 hover:bg-surface-container/60 cursor-pointer transition-colors"
                >
                  <span className="font-bold text-xs text-on-surface block">{course.name}</span>
                  <span className="font-mono text-[11px] text-secondary">
                    {course.code} • {course.professor || 'Prof. TBD'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
