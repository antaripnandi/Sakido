import React, { useState } from 'react';
import { Task, UserProfile } from '../../types';

export type PomodoroRatioKey = '5:1' | '45:15' | '52:17' | '2:1';

export interface FocusSessionConfig {
  mode: 'normal' | 'pomodoro';
  durationMinutes: number;
  pomodoroRatio: PomodoroRatioKey;
  pomoFocusMinutes: number;
  pomoBreakMinutes: number;
  pomodoroCycles: number;
  sound: 'none' | 'rain' | 'binaural' | 'brownian';
  volume: number;
}

interface FocusTimerViewProps {
  tasks?: Task[];
  onStartFocusSession: (config: FocusSessionConfig) => void;
  profile?: UserProfile;
}

const NORMAL_PRESETS = [
  { value: 15, title: '15m', label: 'Quick rest' },
  { value: 25, title: '25m', label: 'Pomodoro' },
  { value: 45, title: '45m', label: 'Deep work' },
  { value: 60, title: '60m', label: 'Study' },
  { value: 90, title: '90m', label: 'Sprint' },
];

const POMODORO_RATIOS: { key: PomodoroRatioKey; title: string; defaultFocus: number }[] = [
  { key: '5:1', title: '5 : 1', defaultFocus: 25 },
  { key: '45:15', title: '3 : 1', defaultFocus: 45 },
  { key: '52:17', title: '52 : 17', defaultFocus: 52 },
  { key: '2:1', title: '2 : 1', defaultFocus: 30 },
];

const CYCLE_PRESETS = [1, 2, 3, 4, 6, 8];

function computeBreakMinutes(ratioKey: PomodoroRatioKey, focusMins: number): number {
  if (ratioKey === '5:1') return Math.max(1, Math.round(focusMins / 5));
  if (ratioKey === '45:15') return Math.max(1, Math.round(focusMins / 3));
  if (ratioKey === '2:1') return Math.max(1, Math.round(focusMins / 2));
  if (ratioKey === '52:17') return Math.max(1, Math.round((focusMins * 17) / 52));
  return Math.max(1, Math.round(focusMins / 5));
}

export const FocusTimerView: React.FC<FocusTimerViewProps> = ({
  onStartFocusSession,
}) => {
  const [timerMode, setTimerMode] = useState<'normal' | 'pomodoro'>('normal');

  // Normal mode state
  const [durationMinutes, setDurationMinutes] = useState<number>(25);

  // Pomodoro mode state
  const [pomodoroRatio, setPomodoroRatio] = useState<PomodoroRatioKey>('5:1');
  const [pomoFocusMinutes, setPomoFocusMinutes] = useState<number>(25);
  const [pomodoroCycles, setPomodoroCycles] = useState<number>(4);

  const handleRatioSelect = (key: PomodoroRatioKey) => {
    setPomodoroRatio(key);
    const target = POMODORO_RATIOS.find(r => r.key === key);
    if (target) {
      setPomoFocusMinutes(target.defaultFocus);
    }
  };

  const currentBreakMinutes = computeBreakMinutes(pomodoroRatio, pomoFocusMinutes);
  const totalFocusMins = pomoFocusMinutes * pomodoroCycles;
  const totalBreakMins = currentBreakMinutes * pomodoroCycles;
  const totalSessionMins = totalFocusMins + totalBreakMins;

  const handleBegin = () => {
    onStartFocusSession({
      mode: timerMode,
      durationMinutes,
      pomodoroRatio,
      pomoFocusMinutes,
      pomoBreakMinutes: currentBreakMinutes,
      pomodoroCycles,
      sound: 'none',
      volume: 0,
    });
  };

  return (
    <div className="font-body-md bg-background text-on-background flex flex-col selection:bg-primary-fixed-dim selection:text-primary rounded-3xl overflow-hidden p-2 md:p-4">
      {/* Main Container */}
      <main className="relative z-10 flex-grow flex items-start justify-center pt-2 md:pt-4 pb-6 px-4">
        <div className="max-w-[720px] w-full space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <h2 className="font-syne text-3xl md:text-5xl tracking-tighter text-on-surface font-semibold">
              Focus Timer
            </h2>
            <p className="font-body-lg text-on-surface-variant max-w-md mx-auto text-sm md:text-base">
              Choose duration or set custom ratios.
            </p>

            {/* Mode Switcher */}
            <div className="inline-flex items-center p-1 rounded-full bg-surface-container border border-outline-variant/60 shadow-2xs mt-2">
              <button
                type="button"
                onClick={() => setTimerMode('normal')}
                className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  timerMode === 'normal'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Timer
              </button>
              <button
                type="button"
                onClick={() => setTimerMode('pomodoro')}
                className={`px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  timerMode === 'pomodoro'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Pomodoro
              </button>
            </div>
          </div>

          {/* Configuration */}
          <div className="space-y-8">
            {timerMode === 'normal' ? (
              /* ONE-TIME TIMER */
              <section className="space-y-6 animate-in fade-in duration-150">
                <div className="grid grid-cols-5 gap-2 md:gap-3">
                  {NORMAL_PRESETS.map((preset) => {
                    const isActive = durationMinutes === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setDurationMinutes(preset.value)}
                        className={`preset-card group flex flex-col items-center justify-center py-5 md:py-6 bg-surface-container border border-outline-variant transition-all rounded-full ${
                          isActive ? 'active' : 'hover:bg-surface-container-high'
                        }`}
                      >
                        <span className={`font-display text-xl md:text-2xl font-bold ${isActive ? '' : 'text-on-surface'}`}>
                          {preset.title}
                        </span>
                        <span
                          className={`font-label-sm text-[10px] md:text-xs text-on-surface-variant group-hover:text-on-surface ${
                            isActive ? 'opacity-90 uppercase tracking-wider text-white dark:text-[#51361c]' : ''
                          }`}
                        >
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Duration Slider */}
                <div className="flex items-center gap-6 md:gap-12 rounded-full py-4 px-4 bg-surface-container/40 border border-outline-variant/40">
                  <div className="flex-shrink-0 w-20 md:w-24 text-center">
                    <span className="font-display text-2xl md:text-3xl font-bold text-on-surface">
                      {durationMinutes}
                    </span>
                    <span className="font-label-sm text-on-surface-variant ml-1 text-xs">min</span>
                  </div>
                  <div className="flex-grow space-y-2">
                    <div className="flex justify-between font-label-sm text-xs text-on-surface-variant opacity-70 uppercase tracking-tighter">
                      <span>Custom length</span>
                      <span>5 - 120 min</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="120"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full cursor-pointer focus-slider"
                    />
                  </div>
                </div>
              </section>
            ) : (
              /* POMODORO CYCLES */
              <section className="space-y-6 animate-in fade-in duration-150">
                {/* Ratio Selection */}
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant block px-1">
                    Ratio
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                    {POMODORO_RATIOS.map((r) => {
                      const isActive = pomodoroRatio === r.key;
                      return (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => handleRatioSelect(r.key)}
                          className={`p-4 rounded-2xl border transition-all text-center flex flex-col justify-center items-center cursor-pointer ${
                            isActive
                              ? 'bg-primary text-on-primary border-primary shadow-xs'
                              : 'bg-surface-container border-outline-variant text-on-surface hover:bg-surface-container-high'
                          }`}
                        >
                          <span className="font-syne font-bold text-base md:text-lg">{r.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Focus Duration Slider for Selected Ratio */}
                <div className="flex items-center gap-6 md:gap-12 rounded-2xl py-4 px-5 bg-surface-container/50 border border-outline-variant/40">
                  <div className="flex-shrink-0 text-left min-w-[120px]">
                    <div className="font-display text-2xl md:text-3xl font-bold text-on-surface">
                      {pomoFocusMinutes} <span className="text-xs font-normal text-on-surface-variant">min focus</span>
                    </div>
                    <div className="text-xs font-mono text-primary font-medium">
                      + {currentBreakMinutes} min rest
                    </div>
                  </div>
                  <div className="flex-grow space-y-2">
                    <div className="flex justify-between font-mono text-[11px] text-on-surface-variant opacity-70 uppercase">
                      <span>Focus duration</span>
                      <span>10 - 90 min</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="5"
                      value={pomoFocusMinutes}
                      onChange={(e) => setPomoFocusMinutes(Number(e.target.value))}
                      className="w-full cursor-pointer focus-slider"
                    />
                  </div>
                </div>

                {/* Repeat Cycles Selector */}
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant block px-1">
                    Repeat cycles
                  </span>
                  <div className="grid grid-cols-6 gap-2">
                    {CYCLE_PRESETS.map((c) => {
                      const isActive = pomodoroCycles === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setPomodoroCycles(c)}
                          className={`py-3 rounded-full border text-xs font-medium transition-all cursor-pointer ${
                            isActive
                              ? 'bg-primary text-on-primary border-primary shadow-xs font-bold'
                              : 'bg-surface-container border-outline-variant text-on-surface hover:bg-surface-container-high'
                          }`}
                        >
                          {c} {c === 1 ? 'Cycle' : 'Cycles'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Summary Box */}
                <div className="p-4 rounded-2xl bg-surface-container/60 border border-outline-variant/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-on-surface block">
                      {pomodoroCycles} cycles · {pomoFocusMinutes}m focus + {currentBreakMinutes}m rest
                    </span>
                    <span className="text-on-surface-variant text-[11px] font-mono">
                      Focus: {totalFocusMins}m  ·  Rest: {totalBreakMins}m
                    </span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-surface-container-high font-mono font-bold text-primary shrink-0">
                    Total: {Math.floor(totalSessionMins / 60)}h {totalSessionMins % 60}m
                  </div>
                </div>
              </section>
            )}

            {/* CTA */}
            <section className="pt-2">
              <button
                type="button"
                onClick={handleBegin}
                className="btn-primary w-full bg-primary text-on-primary h-16 md:h-20 flex items-center justify-center gap-4 group rounded-full shadow-xs font-bold cursor-pointer"
              >
                <span className="font-display text-xl md:text-2xl">Start Session</span>
                <span
                  className="material-symbols-outlined text-[28px] group-hover:translate-x-1 transition-transform"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_arrow
                </span>
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};
