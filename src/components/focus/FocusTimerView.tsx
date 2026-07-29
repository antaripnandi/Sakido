import React, { useState } from 'react';
import { Task, UserProfile } from '../../types';

interface FocusTimerViewProps {
  tasks?: Task[];
  onStartFocusSession: (minutes: number, sound: 'none' | 'rain' | 'binaural' | 'brownian', volume: number) => void;
  profile?: UserProfile;
}

const PRESETS = [
  { value: 15, title: '15', label: 'Quick Rest' },
  { value: 25, title: '25', label: 'Pomodoro' },
  { value: 45, title: '45', label: 'Deep Work' },
  { value: 60, title: '60', label: 'Intense Study' },
  { value: 90, title: '90', label: 'Sprint' },
];

export const FocusTimerView: React.FC<FocusTimerViewProps> = ({
  onStartFocusSession,
}) => {
  const [durationMinutes, setDurationMinutes] = useState<number>(25);
  const [activeAudio, setActiveAudio] = useState<'silent' | 'rain' | 'alpha' | 'deep'>('silent');
  const [volume, setVolume] = useState<number>(50);

  const handleSelectPreset = (val: number) => {
    setDurationMinutes(val);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDurationMinutes(Number(e.target.value));
  };

  const handleBegin = () => {
    let soundParam: 'none' | 'rain' | 'binaural' | 'brownian' = 'none';
    if (activeAudio === 'rain') soundParam = 'rain';
    else if (activeAudio === 'alpha') soundParam = 'binaural';
    else if (activeAudio === 'deep') soundParam = 'brownian';

    onStartFocusSession(durationMinutes, soundParam, volume / 100);
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
        <div className="max-w-[720px] w-full space-y-10">
          {/* Context & Header */}
          <div className="text-center space-y-3">
            <h2 className="font-syne text-3xl md:text-5xl tracking-tighter text-on-surface font-semibold">
              Select Focus Duration
            </h2>
            <p className="font-body-lg text-on-surface-variant max-w-md mx-auto text-sm md:text-base">
              Set your target time and immerse yourself in distraction-free deep work.
            </p>
          </div>

          {/* Configuration Shell */}
          <div className="space-y-10">
            {/* Duration Selection Grid */}
            <section className="space-y-6">
              <div className="grid grid-cols-5 gap-2 md:gap-3">
                {PRESETS.map((preset) => {
                  const isActive = durationMinutes === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => handleSelectPreset(preset.value)}
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
                    onChange={handleSliderChange}
                    className="w-full cursor-pointer focus-slider"
                  />
                </div>
              </div>
            </section>

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
            <section className="pt-4">
              <button
                type="button"
                onClick={handleBegin}
                className="btn-primary w-full bg-primary text-on-primary h-16 md:h-20 flex items-center justify-center gap-4 group rounded-full shadow-md font-bold cursor-pointer"
              >
                <span className="font-display text-xl md:text-2xl">Begin Focus Session</span>
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
