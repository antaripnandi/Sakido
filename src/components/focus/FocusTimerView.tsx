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
  { value: 15, title: '15', label: 'Quick Rest' },
  { value: 25, title: '25', label: 'Pomodoro' },
  { value: 45, title: '45', label: 'Deep Work' },
  { value: 60, title: '60', label: 'Intense Study' },
  { value: 90, title: '90', label: 'Sprint' },
];

const POMODORO_RATIOS: { key: PomodoroRatioKey; title: string; defaultFocus: number; label: string }[] = [
  { key: '5:1', title: '5 : 1 Ratio', defaultFocus: 25, label: '5 parts focus to 1 part rest' },
  { key: '45:15', title: '3 : 1 Ratio', defaultFocus: 45, label: '3 parts focus to 1 part rest' },
  { key: '52:17', title: '52 : 17 Ratio', defaultFocus: 52, label: 'Desktime focus ratio' },
  { key: '2:1', title: '2 : 1 Ratio', defaultFocus: 30, label: '2 parts focus to 1 part rest' },
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

  // Audio state
  const [activeAudio, setActiveAudio] = useState<'silent' | 'rain' | 'alpha' | 'deep'>('silent');
  const [volume, setVolume] = useState<number>(50);

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
    let soundParam: 'none' | 'rain' | 'binaural' | 'brownian' = 'none';
    if (activeAudio === 'rain') soundParam = 'rain';
    else if (activeAudio === 'alpha') soundParam = 'binaural';
    else if (activeAudio === 'deep') soundParam = 'brownian';

    onStartFocusSession({
      mode: timerMode,
      durationMinutes,
      pomodoroRatio,
      pomoFocusMinutes,
      pomoBreakMinutes: currentBreakMinutes,
      pomodoroCycles,
      sound: soundParam,
      volume: volume / 100,
    });
  };

  return (
    <div className="font-body-md bg-background text-on-background flex flex-col min-h-[calc(100vh-5rem)] selection:bg-primary-fixed-dim selection:text-primary rounded-3xl overflow-hidden p-4 md:p-8">
      {/* Top Header */}
      <header className="relative z-10 flex justify-between items-center px-4 md:px-8 py-4 mb-4 border-b border-outline-variant/30">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            timer
          </span>
          <div>
            <h1 className="font-syne text-xl font-bold tracking-tight text-on-surface">Focus Workspace</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-on-surface-variant font-medium hidden sm:inline">
            Setup mode — Fullscreen triggers upon start
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-grow flex items-center justify-center py-6 px-4">
        <div className="max-w-[720px] w-full space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <h2 className="font-syne text-3xl md:text-5xl tracking-tighter text-on-surface font-semibold">
              Select Focus Mode
            </h2>
            <p className="font-body-lg text-on-surface-variant max-w-md mx-auto text-sm md:text-base">
              Choose a single session or customized Pomodoro cycles.
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
                One-Time Timer
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
                Pomodoro Cycles
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
                      <span>Duration</span>
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
                    Select Pomodoro Ratio (Focus : Break)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                    {POMODORO_RATIOS.map((r) => {
                      const isActive = pomodoroRatio === r.key;
                      return (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => handleRatioSelect(r.key)}
                          className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                            isActive
                              ? 'bg-primary text-on-primary border-primary shadow-xs'
                              : 'bg-surface-container border-outline-variant text-on-surface hover:bg-surface-container-high'
                          }`}
                        >
                          <span className="font-syne font-bold text-base md:text-lg">{r.title}</span>
                          <span className={`text-[11px] mt-1 font-mono ${isActive ? 'text-white/80 dark:text-[#51361c]' : 'text-on-surface-variant'}`}>
                            {r.label}
                          </span>
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
                      + {currentBreakMinutes} min break
                    </div>
                  </div>
                  <div className="flex-grow space-y-2">
                    <div className="flex justify-between font-mono text-[11px] text-on-surface-variant opacity-70 uppercase">
                      <span>Adjust Focus Length</span>
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

                {/* Repeat Cycles Selector (No duplicate "4 Cycles" text in header) */}
                <div className="space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant block px-1">
                    Repeat Cycles
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
                      {pomodoroCycles} Cycles × {pomoFocusMinutes}m Focus + {currentBreakMinutes}m Rest
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

            {/* Atmosphere Selection */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="grid grid-cols-4 gap-2 md:gap-3 flex-grow">
                  {[
                    { id: 'silent', label: 'Silent', icon: 'volume_off' },
                    { id: 'rain', label: 'Rain', icon: 'water_drop' },
                    { id: 'alpha', label: 'Alpha', icon: 'graphic_eq' },
                    { id: 'deep', label: 'Deep', icon: 'filter_vintage' },
                  ].map((audio) => {
                    const isActive = activeAudio === audio.id;
                    return (
                      <button
                        key={audio.id}
                        type="button"
                        onClick={() => setActiveAudio(audio.id as any)}
                        className={`audio-btn flex items-center justify-center gap-2 py-3.5 px-3 border font-label-md transition-all rounded-full text-xs md:text-sm ${
                          isActive
                            ? 'active border-primary text-primary bg-primary-fixed-dim/20 font-semibold'
                            : 'border-outline-variant text-on-surface-variant bg-surface-container hover:border-primary hover:text-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{audio.icon}</span>
                        <span>{audio.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 px-4 py-3 border border-outline-variant bg-surface-container rounded-full shrink-0 sm:w-[150px] hover:border-on-surface-variant transition-colors">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">volume_up</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full cursor-pointer opacity-70 hover:opacity-100 transition-opacity focus-slider"
                  />
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="pt-2">
              <button
                type="button"
                onClick={handleBegin}
                className="btn-primary w-full bg-primary text-on-primary h-16 md:h-20 flex items-center justify-center gap-4 group rounded-full shadow-xs font-bold cursor-pointer"
              >
                <span className="font-display text-xl md:text-2xl">
                  {timerMode === 'pomodoro' ? `Begin ${pomodoroCycles} Pomodoro Cycles` : 'Begin Focus Session'}
                </span>
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

      {/* Footer Branding */}
      <footer className="relative z-10 px-4 md:px-8 py-4 flex justify-between items-center opacity-40 font-label-sm text-on-surface text-xs">
        <div className="flex items-center gap-6">
          <span className="font-syne font-semibold tracking-wider">SAKIDO FOCUS</span>
        </div>
      </footer>
    </div>
  );
};
