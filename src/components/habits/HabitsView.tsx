import React, { useState } from 'react';
import { Flame, Check, Plus, Target, Sparkles, Trophy, X } from 'lucide-react';
import { Habit } from '../../types';

interface HabitsViewProps {
  habits: Habit[];
  onToggleHabitDay: (habitId: string, dayIndex: number) => void;
  onAddHabit: (newHabit: Omit<Habit, 'id' | 'streak'>) => void;
}

export const HabitsView: React.FC<HabitsViewProps> = ({
  habits,
  onToggleHabitDay,
  onAddHabit,
}) => {
  const daysShort = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const [showModal, setShowModal] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Habit['category']>('study');
  const [targetDays, setTargetDays] = useState(5);
  const [color, setColor] = useState('#3b82f6');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddHabit({
      name,
      category,
      targetDaysPerWeek: targetDays,
      completedDays: [false, false, false, false, false, false, false],
      color,
    });

    setName('');
    setShowModal(false);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Top Banner & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500" />
            Consistency & Habits
          </span>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            Daily Academic & Personal Routines
          </h2>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Habit
        </button>
      </div>

      {/* Habit List Cards */}
      <div className="space-y-4">
        {habits.map((habit) => {
          const completedCount = habit.completedDays.filter(Boolean).length;
          const targetMet = completedCount >= habit.targetDaysPerWeek;

          return (
            <div
              key={habit.id}
              className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: habit.color }}
                  />
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{habit.name}</h3>
                    <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-semibold uppercase tracking-wide">
                      {habit.category} • Target {habit.targetDaysPerWeek} days/week
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-xl">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    <span>{habit.streak} day streak</span>
                  </div>
                </div>
              </div>

              {/* 7-Day Interactive Checkboxes */}
              <div className="grid grid-cols-7 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                {daysShort.map((dayLabel, idx) => {
                  const isDone = habit.completedDays[idx];
                  return (
                    <div key={idx} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400 font-bold">{dayLabel}</span>
                      <button
                        onClick={() => onToggleHabitDay(habit.id, idx)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          isDone
                            ? 'text-white shadow-xs scale-105'
                            : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-transparent'
                        }`}
                        style={{ backgroundColor: isDone ? habit.color : undefined }}
                      >
                        <Check className={`w-4 h-4 stroke-[3] ${isDone ? 'opacity-100' : 'opacity-0'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Habit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                New Habit Routine
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-md text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                  Habit Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 30m Active Recall Flashcards"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Habit['category'])}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  >
                    <option value="study">Study</option>
                    <option value="health">Health</option>
                    <option value="mindset">Mindset</option>
                    <option value="routine">Routine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1">
                    Target Days / Week
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={targetDays}
                    onChange={(e) => setTargetDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold hover:bg-zinc-800 transition-colors"
                >
                  Save Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
