import React, { useState } from 'react';
import {
  Plus,
  AlertTriangle,
  Flame,
  Clock,
  ChevronLeft,
  ChevronRight,
  PriorityHigh,
  CheckSquare
} from 'lucide-react';

interface TaskItem {
  id: string;
  title: string;
  dueDate: string;
  course: string;
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
}

export const Overview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'due-soon' | 'overdue' | 'completed'>('all');
  const [tasks, setTasks] = useState<TaskItem[]>([
    {
      id: '1',
      title: 'Research Proposal Draft',
      dueDate: 'Tomorrow',
      course: 'Advanced Calculus',
      priority: 'High',
      completed: false,
    },
    {
      id: '2',
      title: 'Problem Set 4',
      dueDate: 'Oct 26',
      course: 'Advanced Calculus',
      priority: 'Medium',
      completed: false,
    },
    {
      id: '3',
      title: 'Midterm Review Notes',
      dueDate: 'Oct 28',
      course: 'Art History',
      priority: 'Low',
      completed: false,
    },
  ]);

  const toggleTask = (id: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  return (
    <main className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col lg:flex-row gap-6 w-full max-w-7xl mx-auto bg-surface text-on-surface font-sans selection:bg-primary selection:text-on-primary">
      {/* Left Column (Main Content) */}
      <div className="flex-1 flex flex-col gap-6 max-w-full lg:max-w-[800px]">
        {/* Header */}
        <header className="space-y-1">
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-on-surface tracking-tight">
            Welcome back, Elara
          </h1>
          <p className="text-secondary dark:text-secondary-fixed-dim text-sm sm:text-base font-normal">
            Your workspace is ready for focus.
          </p>
        </header>

        {/* Stats Row */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Stat 1: Due This Week */}
          <div className="p-4 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#120e0b] shadow-2xs flex flex-col justify-between h-28">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider font-mono">
              Due This Week
            </span>
            <span className="font-display text-2xl sm:text-3xl font-bold text-on-surface">
              4
            </span>
          </div>

          {/* Stat 2: Urgent */}
          <div className="p-4 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#120e0b] shadow-2xs flex flex-col justify-between h-28">
            <span className="text-[11px] font-bold text-error uppercase tracking-wider font-mono flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-error" /> Urgent
            </span>
            <span className="font-display text-2xl sm:text-3xl font-bold text-on-surface">
              1
            </span>
          </div>

          {/* Stat 3: Daily Focus */}
          <div className="p-4 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#120e0b] shadow-2xs flex flex-col justify-between h-28">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider font-mono">
              Daily Focus
            </span>
            <span className="font-display text-2xl sm:text-3xl font-bold text-on-surface flex items-baseline gap-1">
              120<span className="text-xs text-secondary font-mono">m</span>
            </span>
          </div>

          {/* Stat 4: Streak */}
          <div className="p-4 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#120e0b] shadow-2xs flex flex-col justify-between h-28">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider font-mono">
              Streak
            </span>
            <span className="font-display text-2xl sm:text-3xl font-bold text-on-surface flex items-center gap-1">
              5 <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            </span>
          </div>
        </section>

        {/* Tasks Panel */}
        <section className="flex-1 flex flex-col min-h-0 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#120e0b] overflow-hidden shadow-2xs">
          {/* Panel Header */}
          <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low dark:bg-[#1c1613]">
            <h2 className="font-display text-lg font-bold text-on-surface">
              Tasks &amp; Assignments ({tasks.length})
            </h2>
            <button
              type="button"
              className="bg-primary hover:opacity-90 text-on-primary px-3 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="px-4 py-2 border-b border-outline-variant/20 flex gap-4 bg-surface-container-low/50 overflow-x-auto shrink-0 no-scrollbar">
            {(['all', 'upcoming', 'due-soon', 'overdue', 'completed'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`text-xs font-semibold capitalize tracking-wide pb-1 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-primary font-bold border-b-2 border-primary'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </div>

          {/* Task Items List */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {tasks.map(task => (
              <div
                key={task.id}
                className="p-3.5 rounded-xl border border-outline-variant/30 bg-surface-container-low/40 dark:bg-[#1c1613]/50 hover:border-outline-variant/80 transition-all flex gap-3.5 items-start group shadow-2xs"
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id)}
                  className="mt-1 rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3
                      className={`text-sm font-semibold text-on-surface truncate pr-2 ${
                        task.completed ? 'line-through text-secondary' : ''
                      }`}
                    >
                      {task.title}
                    </h3>
                    <span
                      className={`font-mono text-xs shrink-0 ${
                        task.dueDate === 'Tomorrow'
                          ? 'text-error font-bold'
                          : 'text-secondary'
                      }`}
                    >
                      {task.dueDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs text-secondary">
                    <span>{task.course}</span>
                    <span className="w-1 h-1 rounded-full bg-outline-variant" />
                    {task.priority === 'High' ? (
                      <span className="text-error font-semibold flex items-center gap-0.5">
                        <PriorityHigh className="w-3 h-3" /> High Priority
                      </span>
                    ) : (
                      <span>{task.priority} Priority</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Right Column (Sidebar Widgets) */}
      <div className="w-full lg:w-[280px] shrink-0 flex flex-col gap-4">
        {/* Digital Clock */}
        <div className="rounded-2xl border border-outline-variant/40 p-4 bg-surface-container-lowest dark:bg-[#120e0b] flex items-center justify-between shadow-2xs">
          <div>
            <div className="font-display text-xl font-bold text-on-surface mb-0.5">
              10:42 AM
            </div>
            <div className="font-mono text-xs text-secondary">
              Monday, Oct 23
            </div>
          </div>
          <Clock className="w-7 h-7 text-secondary/60" />
        </div>

        {/* Mini Calendar Widget */}
        <div className="rounded-2xl border border-outline-variant/40 p-4 bg-surface-container-lowest dark:bg-[#120e0b] shadow-2xs">
          <div className="flex justify-between items-center mb-3">
            <span className="font-mono text-xs font-bold text-on-surface tracking-wider uppercase">
              OCTOBER 2023
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                className="p-1 rounded-lg hover:bg-surface-container text-secondary hover:text-on-surface transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
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
            {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22].map(d => (
              <div key={d} className="text-secondary/50 py-1">{d}</div>
            ))}
            <div className="bg-primary text-on-primary rounded-lg font-bold py-1 shadow-2xs">
              23
            </div>
            {[24,25,26,27,28,29,30,31].map(d => (
              <div key={d} className="text-on-surface py-1">{d}</div>
            ))}
            {[1,2,3,4].map(d => (
              <div key={`next-${d}`} className="text-secondary/30 py-1">{d}</div>
            ))}
          </div>
        </div>

        {/* Enrolled Courses */}
        <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#120e0b] overflow-hidden flex-1 flex flex-col min-h-0 shadow-2xs">
          <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low dark:bg-[#1c1613] shrink-0">
            <h2 className="font-display text-sm font-bold text-on-surface">Courses</h2>
            <button
              type="button"
              className="font-mono text-xs text-secondary hover:text-primary border-b border-transparent hover:border-primary transition-colors cursor-pointer"
            >
              Manage
            </button>
          </div>

          <div className="p-3 flex flex-col gap-2 overflow-y-auto">
            <div className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-low/30 hover:bg-surface-container/60 cursor-pointer transition-colors">
              <span className="font-bold text-xs text-on-surface block">Advanced Calculus</span>
              <span className="font-mono text-[11px] text-secondary">MATH 401 • Prof. Davis</span>
            </div>
            <div className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-low/30 hover:bg-surface-container/60 cursor-pointer transition-colors">
              <span className="font-bold text-xs text-on-surface block">Art History</span>
              <span className="font-mono text-[11px] text-secondary">ART 210 • Prof. Lin</span>
            </div>
            <div className="p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-low/30 hover:bg-surface-container/60 cursor-pointer transition-colors">
              <span className="font-bold text-xs text-on-surface block">Data Structures</span>
              <span className="font-mono text-[11px] text-secondary">CS 301 • Prof. Smith</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
