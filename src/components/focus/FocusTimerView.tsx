import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  CloudRain, 
  Headphones, 
  Waves, 
  Wind, 
  CheckCircle2, 
  Flame, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import { Task, UserProfile } from '../../types';
import { ambientSynth } from '../../utils/audioSynth';

interface FocusTimerViewProps {
  tasks: Task[];
  initialTaskTitle?: string;
  onSessionCompleted: (minutes: number) => void;
  profile: UserProfile;
}

export const FocusTimerView: React.FC<FocusTimerViewProps> = ({
  tasks,
  initialTaskTitle,
  onSessionCompleted,
  profile,
}) => {
  const [timerMode, setTimerMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  
  // Default minutes: Focus = 25m (1500s), Short Break = 5m (300s), Long Break = 15m (900s)
  const defaultSeconds = { focus: 1500, shortBreak: 300, longBreak: 900 };
  
  const [timeLeft, setTimeLeft] = useState(defaultSeconds.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string>(initialTaskTitle || (tasks[0]?.title || 'General Focus Study'));

  // Ambient sound selector
  const [activeSound, setActiveSound] = useState<'none' | 'rain' | 'binaural' | 'brownian' | 'whitenoise'>('none');
  const [volume, setVolume] = useState(0.3);

  const totalSeconds = defaultSeconds[timerMode];
  const progress = Math.max(0, Math.min(100, ((totalSeconds - timeLeft) / totalSeconds) * 100));

  // Timer loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      if (timerMode === 'focus') {
        const mins = Math.round(defaultSeconds.focus / 60);
        onSessionCompleted(mins);
      }
      ambientSynth.stop();
      setActiveSound('none');
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, timerMode, defaultSeconds.focus, onSessionCompleted]);

  // Handle ambient sound toggle
  const toggleSound = (sound: 'rain' | 'binaural' | 'brownian' | 'whitenoise') => {
    if (activeSound === sound) {
      ambientSynth.stop();
      setActiveSound('none');
    } else {
      setActiveSound(sound);
      ambientSynth.play(sound);
      ambientSynth.setVolume(volume);
    }
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    ambientSynth.setVolume(v);
  };

  const handleModeSwitch = (mode: 'focus' | 'shortBreak' | 'longBreak') => {
    setTimerMode(mode);
    setIsRunning(false);
    setTimeLeft(defaultSeconds[mode]);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(defaultSeconds[timerMode]);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Zen Focus Room
          </span>
          <p className="text-xs text-zinc-800 dark:text-zinc-200 font-semibold mt-0.5">
            Goal: {profile.completedMinutesToday} / {profile.dailyGoalMinutes} mins focused today
          </p>
        </div>

        {/* Task Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-600 font-medium hidden sm:inline">Focusing on:</span>
          <select
            value={selectedTaskTitle}
            onChange={(e) => setSelectedTaskTitle(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 font-medium focus:outline-none max-w-xs truncate"
          >
            <option value="General Deep Study">General Deep Study</option>
            {tasks.map(t => (
              <option key={t.id} value={t.title}>{t.courseName}: {t.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Focus Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Cols: Timer Ring & Controls */}
        <div className="lg:col-span-2 p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center space-y-8">
          {/* Mode Switcher Pills */}
          <div className="flex items-center p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700">
            <button
              onClick={() => handleModeSwitch('focus')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                timerMode === 'focus'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Focus (25m)
            </button>
            <button
              onClick={() => handleModeSwitch('shortBreak')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                timerMode === 'shortBreak'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Short Break (5m)
            </button>
            <button
              onClick={() => handleModeSwitch('longBreak')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                timerMode === 'longBreak'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
            >
              Long Break (15m)
            </button>
          </div>

          {/* Minimal Ring Display */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="currentColor"
                strokeWidth="6"
                className="text-zinc-100 dark:text-zinc-800"
                fill="transparent"
              />
              <circle
                cx="128"
                cy="128"
                r="110"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 110}
                strokeDashoffset={2 * Math.PI * 110 * (1 - progress / 100)}
                strokeLinecap="round"
                className="text-zinc-900 dark:text-zinc-100 transition-all duration-300"
                fill="transparent"
              />
            </svg>

            <div className="absolute text-center space-y-1">
              <span className="text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
                {formatTime(timeLeft)}
              </span>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold tracking-wide uppercase">
                {isRunning ? 'Session Active' : 'Paused'}
              </p>
            </div>
          </div>

          {/* Play / Pause / Reset Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleReset}
              title="Reset Timer"
              className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-8 py-3.5 rounded-2xl text-sm font-bold flex items-center gap-2.5 transition-all shadow-md active:scale-[0.98] ${
                isRunning
                  ? 'bg-rose-500 hover:bg-rose-600 text-white'
                  : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200'
              }`}
            >
              {isRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              <span>{isRunning ? 'Pause Focus' : 'Start Focus'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Ambient Soundscapes Synthesizer */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Headphones className="w-4 h-4 text-indigo-500" />
              Ambient Focus Soundscapes
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              Synthesized real-time focus noise via Web Audio API.
            </p>
          </div>

          {/* Sound Preset Buttons */}
          <div className="space-y-2.5">
            {[
              { id: 'rain', label: 'Gentle Rain', desc: 'Lowpass filtered rainfall noise', icon: <CloudRain className="w-4 h-4 text-sky-500" /> },
              { id: 'binaural', label: 'Alpha Beats (10Hz)', desc: 'Brainwave focus tone (use headphones)', icon: <Waves className="w-4 h-4 text-indigo-500" /> },
              { id: 'brownian', label: 'Deep Space / Brown Noise', desc: 'Warm low-frequency ambient rumble', icon: <Wind className="w-4 h-4 text-amber-500" /> },
            ].map(s => {
              const isActive = activeSound === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSound(s.id as 'rain' | 'binaural' | 'brownian' | 'whitenoise')}
                  className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                    isActive
                      ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 shadow-2xs ring-1 ring-zinc-900 dark:ring-zinc-100'
                      : 'border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-white dark:bg-zinc-700 shadow-2xs">
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{s.label}</span>
                      {isActive && <span className="text-[10px] font-semibold text-emerald-600 animate-pulse">Playing</span>}
                    </div>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-0.5">{s.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Volume Slider */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <span className="flex items-center gap-1.5">
                {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                Ambient Volume
              </span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-full accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
