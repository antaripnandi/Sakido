import React from 'react';
import { 
  Timer, 
  CheckSquare, 
  Flame, 
  ArrowUpRight, 
  Clock, 
  MapPin, 
  Plus, 
  Check, 
  ChevronRight,
  BookOpen,
  Sparkles,
  Zap,
  TrendingUp
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
  // Today is Wednesday in our mock timetable (Day 3)
  const todayClasses = schedule.filter(s => s.dayOfWeek === 3).sort((a, b) => a.startTime.localeCompare(b.startTime));
  
  const urgentTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'submitted');
  const completedTodayCount = tasks.filter(t => t.status === 'completed').length;

  const progressPercent = Math.round((profile.completedMinutesToday / profile.dailyGoalMinutes) * 100);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Hero Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Daily Focus Goal Ring Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Focus Goal
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{profile.completedMinutesToday}</span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">/ {profile.dailyGoalMinutes} mins</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {progressPercent}% achieved
            </p>
          </div>

          {/* Minimal Ring Graphic */}
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="4"
                className="text-zinc-100 dark:text-zinc-800"
                fill="transparent"
              />
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray={2 * Math.PI * 22}
                strokeDashoffset={2 * Math.PI * 22 * (1 - Math.min(100, progressPercent) / 100)}
                strokeLinecap="round"
                className="text-indigo-600 dark:text-indigo-400 transition-all duration-500"
                fill="transparent"
              />
            </svg>
            <Timer className="w-4 h-4 text-indigo-600 dark:text-indigo-400 absolute" />
          </div>
        </div>

        {/* Tasks Completed Today */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Tasks Solved
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{completedTodayCount}</span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">items today</span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium mt-1">
              {urgentTasks.length} pending assignments
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>

        {/* Active Study Streak */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Study Streak
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{profile.streakDays}</span>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">days running</span>
            </div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center gap-1">
              <Flame className="w-3 h-3 fill-amber-500" />
              Personal best!
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        {/* Quick Focus Starter Box */}
        <div className="p-5 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Zen Focus
            </span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold mt-1">Ready for 25m study sprint?</p>
            <button
              onClick={() => onStartFocusWithTask()}
              className="mt-3 w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/20 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              Start Pomodoro
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Schedule + Priority Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Today's Tasks & Homework (2 cols wide) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                Priority Homework & Tasks
                <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                  {urgentTasks.length}
                </span>
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">Items sorted by urgency for today</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onQuickAddTask}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
              >
                View all
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Task Card Items */}
          <div className="space-y-3">
            {urgentTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex items-start gap-3.5 group"
              >
                {/* Interactive Checkbox */}
                <button
                  onClick={() => onToggleTaskStatus(task.id)}
                  className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    task.status === 'completed'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500 bg-zinc-50 dark:bg-zinc-800'
                  }`}
                >
                  {task.status === 'completed' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase"
                      style={{ backgroundColor: `${task.courseColor}18`, color: task.courseColor }}
                    >
                      {task.courseName}
                    </span>

                    {task.priority === 'urgent' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                        Urgent
                      </span>
                    )}
                    {task.priority === 'high' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                        High
                      </span>
                    )}

                    <span className="text-[11px] text-zinc-600 dark:text-zinc-400 ml-auto font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-600" />
                      {task.dueDate}
                    </span>
                  </div>

                  <h3 className={`text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1.5 ${task.status === 'completed' ? 'line-through text-zinc-600' : ''}`}>
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-1 font-normal">
                      {task.description}
                    </p>
                  )}

                  {/* Subtask count & quick focus button */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400">
                    <span>
                      {task.subtasks ? `${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length} subtasks completed` : '1 action item'}
                    </span>

                    <button
                      onClick={() => onStartFocusWithTask(task.title)}
                      className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
                    >
                      <Timer className="w-3 h-3" />
                      Focus on this
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Today's Schedule & Enrolled Courses */}
        <div className="space-y-6">
          {/* Today's Schedule Timeline */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Today's Timetable</h3>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">Wednesday • 3 Lectures</p>
              </div>
              <button
                onClick={() => onNavigate('schedule')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Full Grid
              </button>
            </div>

            <div className="space-y-3 relative before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
              {todayClasses.map((item, idx) => (
                <div key={item.id} className="relative pl-7 group">
                  {/* Bullet */}
                  <span
                    className="absolute left-1.5 top-2.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-zinc-900 transform -translate-x-1/2"
                    style={{ backgroundColor: item.color }}
                  />

                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold" style={{ color: item.color }}>
                        {item.courseCode}
                      </span>
                      <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-700 px-1.5 py-0.5 rounded shadow-2xs">
                        {item.startTime} - {item.endTime}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-1">
                      {item.courseName}
                    </p>

                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-zinc-600" />
                      {item.room} • {item.instructor}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Note / Course Hub Snippet */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Course Standing</span>
              <button onClick={() => onNavigate('courses')} className="text-[11px] text-zinc-600 hover:text-zinc-900 dark:text-zinc-400">
                Details
              </button>
            </div>

            <div className="space-y-2.5">
              {courses.slice(0, 3).map((course) => (
                <div key={course.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-zinc-800 dark:text-zinc-200">{course.code}</span>
                    <span className="text-zinc-600 dark:text-zinc-400 font-semibold">{course.currentGrade}</span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${course.progress}%`, backgroundColor: course.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
