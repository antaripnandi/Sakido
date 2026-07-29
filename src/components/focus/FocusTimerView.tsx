import React, { useState } from 'react';
import { Task, UserProfile } from '../../types';

export type PomodoroRatioKey = '5:1' | '45:15' | '52:17' | '2:1';

export interface FocusSessionConfig {
  mode: 'normal' | 'pomodoro';
  durationMinutes: number;
  pomodoroRatio: PomodoroRatioKey;
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

const POMODORO_RATIOS: { key: PomodoroRatioKey; title: string; focus: number; break: number; label: string }[] = [
  { key: '5:1', title: '5 : 1 Ratio', focus: 25, break: 5, label: '25m Focus / 5m Break (Classic)' },
  { key: '45:15', title: '45 : 15 Ratio', focus: 45, break: 15, label: '45m Focus / 15m Break (Deep)' },
  { key: '52:17', title: '52 : 17 Ratio', focus: 52, break: 17, label: '52m Focus / 17m Break (Science)' },
  { key: '2:1', title: '2 : 1 Ratio', focus: 30, break: 15, label: '30m Focus / 15m Break (Balanced)' },
];

const CYCLE_PRESETS = [1, 2, 3, 4, 6, 8];

export const FocusTimerView: React.FC<FocusTimerViewProps> = ({
  onStartFocusSession,
}) => {
  const [timerMode, setTimerMode] = useState<'normal' | 'pomodoro'>('normal');

  // Normal mode state
  const [durationMinutes, setDurationMinutes] = useState<number>(25);

  // Pomodoro mode state
  const [pomodoroRatio, setPomodoroRatio] = useState<PomodoroRatioKey>('5:1');
  const [pomodoroCycles, setPomodoroCycles] = useState<number>(4);

  // Audio state
  const [activeAudio, setActiveAudio] = useState<'silent' | 'rain' | 'alpha' | 'deep'>('silent');
  const [volume, setVolume] = useState<number>(50);

  const selectedRatioConfig = POMODORO_RATIOS.find(r => r.key === pomodoroRatio) || POMODORO_RATIOS[0];
  const totalFocusMins = selectedRatioConfig.focus * pomodoroCycles;
  const totalBreakMins = selectedRatioConfig.break * pomodoroCycles;
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
      pomodoroCycles,
      sound: soundParam,
      volume: volume / 100,
    });
  };

  return (
    <div className="font-body-md bg-background text-on-background flex flex-col min-h-[calc(100vh-5rem)] selection:bg-primary-fixed-dim selection:text-primary rounded-3xl overflow-hidden p-4 md:p-8">
      {/* Navigation Shell (Top Bar) */}
      <header className="relative z-10 flex justify-between items-center px-4 md:px-8 py-4 mb-4 border-b border-outline-variant/30">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            timer
          </span>
          <div>
            <h1 className="font-syne text-xl font-bold tracking-tight text-on-surface">Sakido | Focus Zone</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-on-surface-variant font-medium hidden sm:inline">
            Setup mode — Fullscreen locks upon start
          </span>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="relative z-10 flex-grow flex items-center justify-center py-6 px-4">
        <div className="max-w-[720px] w-full space-y-8">
          {/* Context & Header */}
          <div className="text-center space-y-3">
            <h2 className="font-syne text-3xl md:text-5xl tracking-tighter text-on-surface font-semibold">
              Select Focus Protocol
            </h2>
            <p className="font-body-lg text-on-surface-variant max-w-md mx-auto text-sm md:text-base">
              Choose a single countdown timer or structured Pomodoro focus/rest cycles.
            </p>

            {/* Mode Switcher Pills */}
            <div className="inline-flex items-center p-1.5 rounded-full bg-surface-container border border-outline-variant/60 shadow-2xs mt-2">
              <button
                type="button"
                onClick={() => setTimerMode('normal')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  timerMode === 'normal'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                ⏱️ One-Time Timer
              </button>
              <button
                type="button"
                onClick={() => setTimerMode('pomodoro')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  timerMode === 'pomodoro'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                🍅 Pomodoro Cycles
              </button>
            </div>
          </div>

          {/* Configuration Shell */}
          <div className="space-y-8">
            {timerMode === 'normal' ? (
              /* ONE-TIME NORMAL TIMER MODE */
              <section className="space-y-6 animate-in fade-in duration-200">
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
                      <span>Custom Duration</span>
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
              /* POMODORO MULTI-CYCLE MODE */
              <section className="space-y-6 animate-in fade-in duration-200">
                {/* Ratio Selection */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant font-mono block px-1">
                    Select Pomodoro Ratio (Focus : Break)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                    {POMODORO_RATIOS.map((r) => {
                      const isActive = pomodoroRatio === r.key;
                      return (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => setPomodoroRatio(r.key)}
                          className={`p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer ${
                            isActive
                              ? 'bg-primary text-on-primary border-primary shadow-md scale-[1.02]'
                              : 'bg-surface-container border-outline-variant text-on-surface hover:bg-surface-container-high'
                          }`}
                        >
                          <span className="font-syne font-bold text-base md:text-lg">{r.title}</span>
                          <span className={`text-[11px] mt-1 font-mono ${isActive ? 'text-white/80 dark:text-[#51361c]' : 'text-on-surface-variant'}`}>
                            {r.focus}m / {r.break}m
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cycle Count Selector */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono px-1">
                    <span className="font-bold uppercase tracking-wider text-on-surface-variant">
                      Pomodoro Repeat Cycles
                    </span>
                    <span className="text-primary font-bold">{pomodoroCycles} Cycles</span>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {CYCLE_PRESETS.map((c) => {
                      const isActive = pomodoroCycles === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setPomodoroCycles(c)}
                          className={`py-3 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-primary text-on-primary border-primary shadow-sm'
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
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🍅</span>
                    <div>
                      <span className="font-bold text-on-surface block">
                        {pomodoroCycles} Cycles × {selectedRatioConfig.focus}m Focus + {selectedRatioConfig.break}m Break
                      </span>
                      <span className="text-on-surface-variant text-[11px]">
                        Total Focus: {totalFocusMins}m  ·  Total Rest: {totalBreakMins}m
                      </span>
                    </div>
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

            {/* Action Anchor CTA */}
            <section className="pt-2">
              <button
                type="button"
                onClick={handleBegin}
                className="btn-primary w-full bg-primary text-on-primary h-16 md:h-20 flex items-center justify-center gap-4 group rounded-full shadow-md font-bold cursor-pointer"
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

      {/* Global Footer Branding */}
      <footer className="relative z-10 px-4 md:px-8 py-4 flex justify-between items-center opacity-50 font-label-sm text-on-surface text-xs">
        <div className="flex items-center gap-6">
          <span className="font-syne font-semibold tracking-wider">SAKIDO FOCUS</span>
        </div>
        <div>Stanford Academic Portal</div>
      </footer>
    </div>
  );
};
