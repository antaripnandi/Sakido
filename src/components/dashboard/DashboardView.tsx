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

  // Derive Summary Strip Metrics
  const now = new Date();
  const urgentTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'submitted');
  const completedCount = tasks.filter(t => t.status === 'completed' || t.status === 'submitted').length;
  
  // Categorize tasks for metrics
  const overdueCount = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length;
  const dueSoonCount = tasks.filter(t => (t.priority === 'high' || t.priority === 'urgent') && t.status !== 'completed').length;
  
  // Combine tasks & assessments into a single unified list
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
      let status: 'upcoming' | 'due-soon' | 'overdue' | 'completed' = 'upcoming';
      if (t.status === 'completed' || t.status === 'submitted') {
        status = 'completed';
      } else if (t.priority === 'urgent') {
        status = 'overdue';
      } else if (t.priority === 'high') {
        status = 'due-soon';
      }

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

    // Add Exams & Key Lectures from Schedule
    schedule.forEach(s => {
      items.push({
        id: `schedule-${s.id}`,
        title: `${s.type === 'exam' ? 'EXAM: ' : ''}${s.courseName}`,
        courseName: s.courseCode,
        courseColor: s.color,
        type: s.type === 'exam' ? 'exam' : 'lecture',
        dueDate: `${s.startTime} - ${s.endTime}`,
        status: s.type === 'exam' ? 'due-soon' : 'upcoming',
        rawObject: s,
      });
    });

    return items;
  }, [tasks, schedule]);

  // Filtered Items for Main Unified View
  const filteredAcademicItems = useMemo(() => {
    return unifiedAcademicItems.filter(item => {
      // Filter by Course
      if (selectedCourse !== 'all' && item.courseName !== selectedCourse && !item.title.includes(selectedCourse)) {
        return false;
      }
      // Filter by Status
      if (statusFilter === 'all') return true;
      if (statusFilter === 'completed') return item.status === 'completed';
      if (statusFilter === 'overdue') return item.status === 'overdue';
      if (statusFilter === 'due-soon') return item.status === 'due-soon';
      if (statusFilter === 'upcoming') return item.status === 'upcoming';
      return true;
    });
  }, [unifiedAcademicItems, statusFilter, selectedCourse]);

  const progressPercent = Math.round((profile.completedMinutesToday / profile.dailyGoalMinutes) * 100);

  // Compact Calendar Days Generator (Current Month)
  const currentMonthDays = useMemo(() => {
    const totalDays = 31; // Days in current month representation
    const daysArr = [];
    for (let d = 1; d <= totalDays; d++) {
      const hasTask = d % 4 === 0 || d === 15 || d === 22 || d === 28;
      const hasExam = d === 12 || d === 25;
      daysArr.push({ day: d, hasTask, hasExam });
    }
    return daysArr;
  }, []);

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
              <span className="text-2xl font-bold text-on-surface">{profile.completedMinutesToday}</span>
              <span className="text-xs text-secondary font-medium">/ {profile.dailyGoalMinutes} mins</span>
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
                strokeDashoffset={2 * Math.PI * 17 * (1 - Math.min(100, progressPercent) / 100)}
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
              <span className="text-2xl font-bold text-on-surface">{profile.streakDays}</span>
              <span className="text-xs text-secondary font-medium">days active</span>
            </div>
            <p className="text-[11px] text-amber-500 font-medium mt-1 flex items-center gap-1">
              <Flame className="w-3 h-3 fill-amber-500" />
              Keep momentum going
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
        </div>
      </div>

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
              <div className="p-8 text-center rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-low">
                <CheckSquare className="w-8 h-8 text-secondary/60 mx-auto mb-2" />
                <p className="text-sm font-semibold text-on-surface">No academic items match current filter</p>
                <p className="text-xs text-secondary mt-1">Try switching status filters or adding a new assignment</p>
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
                          onClick={() => onNavigate(isTask ? 'tasks' : 'schedule')}
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

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {currentMonthDays.map((d) => {
                const isSelected = selectedDate === d.day;
                const isToday = d.day === now.getDate();

                return (
                  <button
                    key={d.day}
                    onClick={() => {
                      setSelectedDate(d.day);
                      onNavigate('calendar'); // Direct-to-task access
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
                    {/* Dots for tasks / exams */}
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
                onClick={() => onNavigate('courses')}
                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
              >
                Manage Classes
              </button>
            </div>

            <div className="space-y-3">
              {courses.slice(0, 4).map((course) => (
                <div
                  key={course.id}
                  onClick={() => onNavigate('courses')}
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
