import React, { useState } from 'react';
import { Search, Bell, Plus, Sparkles, Check, Clock, BookOpen, ChevronDown } from 'lucide-react';
import { NavView } from '../../types';

interface HeaderProps {
  currentView: NavView;
  onOpenCommand: () => void;
  onQuickAddTask: () => void;
  onQuickAddNote: () => void;
}

const viewTitles: Record<NavView, { title: string; subtitle: string }> = {
  dashboard: { title: 'Good morning, Alex 👋', subtitle: 'Here is your academic overview and focus plan for today.' },
  tasks: { title: 'Tasks & Assignments', subtitle: 'Manage coursework, problem sets, and submission deadlines.' },
  notes: { title: 'Course Notes & Knowledge', subtitle: 'Lecture summaries, markdown documents, and active recall notes.' },
  focus: { title: 'Zen Focus Room', subtitle: 'Deep work timer with ambient focus soundscapes.' },
  schedule: { title: 'Class Timetable', subtitle: 'Weekly lecture schedule, discussion sections, and room locations.' },
  habits: { title: 'Daily Habits & Routines', subtitle: 'Track study consistency, physical health, and personal goals.' },
  courses: { title: 'Enrolled Courses', subtitle: 'Academic syllabus, grade benchmarks, and professor contact info.' },
};

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onOpenCommand,
  onQuickAddTask,
  onQuickAddNote,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);

  const notifications = [
    {
      id: '1',
      title: 'CS 201 Red-Black Rotation Benchmark',
      time: 'Due Today at 11:59 PM',
      type: 'urgent',
      icon: <Clock className="w-3.5 h-3.5 text-rose-500" />,
    },
    {
      id: '2',
      title: 'MATH 204 Midterm Exam Announcement',
      time: 'Prof. Chen posted study guide',
      type: 'info',
      icon: <BookOpen className="w-3.5 h-3.5 text-indigo-500" />,
    },
    {
      id: '3',
      title: 'PHYS 101 Lab 3 Rotational Dynamics',
      time: 'Due in 3 days',
      type: 'upcoming',
      icon: <Check className="w-3.5 h-3.5 text-amber-500" />,
    },
  ];

  const info = viewTitles[currentView];

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-6 flex items-center justify-between transition-colors duration-200">
      {/* Title section */}
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
          {info.title}
        </h1>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 hidden sm:block font-medium">
          {info.subtitle}
        </p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Search Bar / Raycast Command button */}
        <button
          onClick={onOpenCommand}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-2xs group"
        >
          <Search className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300" />
          <span className="hidden md:inline font-medium text-zinc-600 dark:text-zinc-400">Search tasks, notes, courses...</span>
          <span className="md:hidden font-medium text-zinc-600 dark:text-zinc-400">Search</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-700 rounded border border-zinc-200 dark:border-zinc-600 shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Quick Add Menu */}
        <div className="relative">
          <button
            onClick={() => setShowQuickAddMenu(!showQuickAddMenu)}
            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-xs active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {showQuickAddMenu && (
            <div 
              className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150"
              onMouseLeave={() => setShowQuickAddMenu(false)}
            >
              <button
                onClick={() => {
                  setShowQuickAddMenu(false);
                  onQuickAddTask();
                }}
                className="w-full text-left px-3.5 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between"
              >
                <span>New Task / Homework</span>
                <span className="text-[10px] text-zinc-600">T</span>
              </button>
              <button
                onClick={() => {
                  setShowQuickAddMenu(false);
                  onQuickAddNote();
                }}
                className="w-full text-left px-3.5 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between"
              >
                <span>New Course Note</span>
                <span className="text-[10px] text-zinc-600">N</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-zinc-900" />
          </button>

          {showNotifications && (
            <div 
              className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-3 z-50 text-xs"
              onMouseLeave={() => setShowNotifications(false)}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800 px-1">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">Academic Alerts</span>
                <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">3 New</span>
              </div>
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-2.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <div className="p-1 rounded-lg bg-white dark:bg-zinc-700 shadow-2xs mt-0.5">
                      {n.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200 leading-snug">{n.title}</p>
                      <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
