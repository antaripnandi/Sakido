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
    <div className="p-4 sm:p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* 1. Summary Strip — Time-Sensitive Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Tasks Due This Week */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-outline-variant/40 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider font-mono">
              Due This Week
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-on-surface">{urgentTasks.length}</span>
              <span className="text-xs text-secondary font-medium">active items</span>
            </div>
            <p className="text-[11px] text-primary font-medium mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {dueSoonCount} high priority
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Overdue / Urgent Flags */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-outline-variant/40 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider font-mono">
              Urgent & Overdue
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-on-surface">{overdueCount}</span>
              <span className="text-xs text-secondary font-medium">requires action</span>
            </div>
            <p className="text-[11px] text-error font-medium mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {overdueCount > 0 ? 'Immediate review needed' : 'All clear for now'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-error-container/20 flex items-center justify-center text-error shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Focus Minutes Progress */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-outline-variant/40 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider font-mono">
              Daily Focus Goal
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-on-surface">{completedMinutesToday}</span>
              <span className="text-xs text-secondary font-medium">/ {dailyGoalMinutes} mins</span>
            </div>
            <p className="text-[11px] text-emerald-500 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {progressPercent}% completed
            </p>
          </div>
          <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="22"
                cy="22"
                r="17"
                stroke="currentColor"
                strokeWidth="3.5"
                className="text-surface-container-high"
                fill="transparent"
              />
              <circle
                cx="22"
                cy="22"
                r="17"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeDasharray={2 * Math.PI * 17}
                strokeDashoffset={2 * Math.PI * 17 * (1 - progressPercent / 100)}
                strokeLinecap="round"
                className="text-primary transition-all duration-500"
                fill="transparent"
              />
            </svg>
            <Timer className="w-4 h-4 text-primary absolute" />
          </div>
        </div>

        {/* Metric 4: Streak Count */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-outline-variant/40 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider font-mono">
              Study Streak
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-on-surface">{streakDays}</span>
              <span className="text-xs text-secondary font-medium">days active</span>
            </div>
            <p className="text-[11px] text-amber-500 font-medium mt-1 flex items-center gap-1">
              <Flame className="w-3 h-3 fill-amber-500" />
              {streakDays > 0 ? 'Keep momentum going' : 'Start your streak today'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Next Upcoming Event - Prominent Display */}
      {nextUpcoming && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#8b5e3c]/5 to-[#8b5e3c]/10 border-2 border-[#8b5e3c]/30 shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#8b5e3c] dark:text-amber-400">
                  Next Up
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  nextUpcoming.type === 'exam'
                    ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                    : nextUpcoming.type === 'task'
                    ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                    : 'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                }`}>
                  {nextUpcoming.type}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-on-surface mb-1">
                {nextUpcoming.title}
              </h2>
              <p className="text-sm text-secondary font-medium">
                {nextUpcoming.courseName}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[#8b5e3c] dark:text-amber-400 font-mono">
                {formatTimeRemaining(nextUpcoming.msUntil)}
              </div>
              <div className="text-xs text-secondary mt-1 font-mono">
                {nextUpcoming.dateTime.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Overview Grid: Filterable Unified Hub + Compact Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 8 Cols: Unified Academic Hub */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Controls: Filters & Quick Add */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
            <div>
              <h2 className="text-lg font-bold text-on-surface tracking-tight flex items-center gap-2">
                Academic Overview & Tasks
                <span className="px-2 py-0.5 rounded-full text-xs bg-surface-container-high text-secondary font-mono">
                  {filteredAcademicItems.length}
                </span>
              </h2>
              <p className="text-xs text-secondary font-medium mt-0.5">
                Centralized assignments, exams, and class schedules across all courses
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onQuickAddTask}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-all cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>
          </div>

          {/* Status & Course Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {(['all', 'upcoming', 'due-soon', 'overdue', 'completed'] as StatusFilter[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-primary text-on-primary shadow-2xs'
                      : 'bg-surface-container-low text-secondary hover:text-on-surface border border-outline-variant/30'
                  }`}
                >
                  {st.replace('-', ' ')}
                </button>
              ))}
            </div>

            {/* Course Dropdown Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-secondary" />
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="text-xs font-semibold bg-surface-container-low border border-outline-variant/40 text-on-surface rounded-xl px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Classes</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.code}>{c.code} - {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Unified List Items */}
          <div className="space-y-3">
            {filteredAcademicItems.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-low/60 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-secondary shadow-2xs">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-on-surface">
                    {statusFilter !== 'all' || selectedCourse !== 'all' ? 'No items match filter' : 'No upcoming tasks due'}
                  </h4>
                  <p className="text-xs text-secondary mt-1 max-w-xs mx-auto">
                    {statusFilter !== 'all' || selectedCourse !== 'all'
                      ? 'Try selecting a different status filter or class.'
                      : 'Your task list is clear! Add a new assignment to keep track of deadlines.'}
                  </p>
                </div>
                <button
                  onClick={onQuickAddTask}
                  className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-all shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Task
                </button>
              </div>
            ) : (
              filteredAcademicItems.slice(0, 7).map((item) => {
                const isTask = item.type === 'task';
                const taskObj = isTask ? (item.rawObject as Task) : null;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 hover:border-outline-variant/70 shadow-2xs transition-all flex items-start gap-3.5 group"
                  >
                    {/* Interactive Checkbox for Tasks */}
                    {isTask && taskObj ? (
                      <button
                        onClick={() => onToggleTaskStatus(taskObj.id)}
                        className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                          taskObj.status === 'completed'
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-outline-variant/60 hover:border-primary bg-surface-container'
                        }`}
                      >
                        {taskObj.status === 'completed' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    ) : (
                      <div className="mt-0.5 w-5 h-5 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase font-mono"
                          style={{
                            backgroundColor: `${item.courseColor || '#6366f1'}18`,
                            color: item.courseColor || '#6366f1',
                          }}
                        >
                          {item.courseName}
                        </span>

                        {/* Status Badges */}
                        {item.status === 'overdue' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-error-container/40 text-error">
                            Overdue / Urgent
                          </span>
                        )}
                        {item.status === 'due-soon' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/20 text-amber-500">
                            Due Soon
                          </span>
                        )}
                        {item.status === 'completed' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/20 text-emerald-500">
                            Completed
                          </span>
                        )}

                        <span className="text-[11px] text-secondary ml-auto font-medium flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-secondary/60" />
                          {item.dueDate}
                        </span>
                      </div>

                      <h3 className={`text-sm font-semibold text-on-surface mt-1.5 ${item.status === 'completed' ? 'line-through text-secondary' : ''}`}>
                        {item.title}
                      </h3>

                      {/* Direct-to-Task Module Access Button */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-outline-variant/20 text-[11px] text-secondary">
                        <span className="capitalize font-mono text-[10px]">
                          {item.type === 'task' ? 'Assignment' : item.type === 'exam' ? 'Assessment' : 'Lecture'}
                        </span>

                        <button
                          onClick={() => onNavigate(isTask ? 'tasks' : 'calendar')}
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 group-hover:translate-x-0.5 transition-transform cursor-pointer"
                        >
                          Open in {isTask ? 'Tasks & Grades' : 'Schedule'}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 4 Cols: Compact Calendar Widget & Class Quick Access */}
        <div className="lg:col-span-4 space-y-6">
          {/* Compact Calendar Widget */}
          <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/40 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  Academic Calendar
                </h3>
                <p className="text-[11px] text-secondary font-mono">
                  {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => onNavigate('calendar')}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                Full Calendar
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Calendar Grid Header */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-secondary font-mono mb-2">
              <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>

            {/* Dynamic Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {currentMonthDays.map((d, index) => {
                if (d.day === null) {
                  return <div key={`pad-${index}`} className="h-8" />;
                }
                const isSelected = selectedDate === d.day;
                const isToday = d.day === now.getDate();

                return (
                  <button
                    key={`day-${d.day}`}
                    onClick={() => {
                      if (d.day !== null) {
                        setSelectedDate(d.day);
                        onNavigate('calendar');
                      }
                    }}
                    className={`h-8 rounded-xl flex flex-col items-center justify-center relative text-xs font-medium transition-all cursor-pointer ${
                      isToday
                        ? 'bg-primary text-on-primary font-bold shadow-2xs'
                        : isSelected
                        ? 'bg-surface-container-high text-on-surface border border-outline-variant/40'
                        : 'hover:bg-surface-container/60 text-on-surface'
                    }`}
                  >
                    <span>{d.day}</span>
                    {/* Dots for REAL user tasks / exams */}
                    <div className="flex items-center gap-0.5 absolute bottom-1">
                      {d.hasExam && <span className="w-1 h-1 rounded-full bg-error" />}
                      {d.hasTask && <span className="w-1 h-1 rounded-full bg-amber-400" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-secondary font-mono">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Tasks
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-error" /> Exams
              </span>
              <button
                onClick={() => onNavigate('calendar')}
                className="text-primary hover:underline font-semibold"
              >
                View Details →
              </button>
            </div>
          </div>

          {/* Quick Enrolled Class Roster (Read-Only Direct Links) */}
          <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/40 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-on-surface">Enrolled Courses</span>
              <button
                onClick={() => onNavigate('classes')}
                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
              >
                Manage Classes
              </button>
            </div>

            <div className="space-y-3">
              {courses.length === 0 ? (
                <div className="p-5 text-center rounded-xl border border-dashed border-outline-variant/40 bg-surface-container/30 flex flex-col items-center justify-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-secondary shadow-2xs">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface">No classes added yet</p>
                    <p className="text-[11px] text-secondary mt-0.5">Enroll to track grades and assignment deadlines</p>
                  </div>
                  <button
                    onClick={() => onNavigate('classes')}
                    className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-all shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Class
                  </button>
                </div>
              ) : (
                courses.slice(0, 4).map((course) => (
                  <div
                    key={course.id}
                    onClick={() => onNavigate('classes')}
                    className="p-3 rounded-xl bg-surface-container/40 hover:bg-surface-container border border-outline-variant/20 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-on-surface">{course.code}</span>
                        <span className="text-[10px] font-mono text-secondary">{course.currentGrade}</span>
                      </div>
                      <p className="text-[11px] text-secondary truncate max-w-[160px]">{course.name}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-secondary group-hover:translate-x-0.5 transition-transform" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
