import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Timer, 
  CloudRain, 
  Waves, 
  Wind, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Sparkles,
  Maximize2,
  Minimize2,
  Plus,
  Minus
} from 'lucide-react';
import { ambientSynth } from '../../utils/audioSynth';

interface FocusTimerProps {
  initialMinutes?: number;
  initialSound?: 'none' | 'rain' | 'binaural' | 'brownian';
  initialVolume?: number;
  onClose: () => void;
}

type Phase = 'setup' | 'running';

const PRESETS = [
  { label: '15m', minutes: 15, tag: 'Quick Rest' },
  { label: '25m', minutes: 25, tag: 'Pomodoro' },
  { label: '45m', minutes: 45, tag: 'Deep Work' },
  { label: '60m', minutes: 60, tag: 'Intense Study' },
  { label: '90m', minutes: 90, tag: 'Sprint' },
];

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({
  initialMinutes = 25,
  initialSound = 'none',
  initialVolume = 0.5,
  onClose,
}) => {
  const initialSecs = initialMinutes * 60;
  const [phase, setPhase] = useState<Phase>('running');
  const [inputMinutes, setInputMinutes] = useState<string>(String(initialMinutes));
  const [totalSecs, setTotalSecs] = useState(initialSecs);
  const [timeLeft, setTimeLeft] = useState(initialSecs);
  const [isRunning, setIsRunning] = useState(true);
  const [finished, setFinished] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Soundscape state
  const [activeSound, setActiveSound] = useState<'none' | 'rain' | 'binaural' | 'brownian'>(initialSound);
  const [volume, setVolume] = useState(initialVolume);
  const [showSoundControls, setShowSoundControls] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start sound on mount if configured
  useEffect(() => {
    if (initialSound && initialSound !== 'none') {
      ambientSynth.play(initialSound as 'rain' | 'binaural' | 'brownian');
      ambientSynth.setVolume(initialVolume);
    }
    // Attempt fullscreen on start
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, [initialSound, initialVolume]);

  // Exit soundscape on unmount
  useEffect(() => {
    return () => {
      ambientSynth.stop();
    };
  }, []);

  // --- Ambient sound toggle ---
  const handleToggleSound = (sound: 'rain' | 'binaural' | 'brownian') => {
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

  // --- Fullscreen helpers ---
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
  }, []);

  // --- Exit focus & close window ---
  const handleQuit = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    ambientSynth.stop();
    setActiveSound('none');
    exitFullscreen();
    onClose();
  }, [exitFullscreen, onClose]);

  // --- Keyboard Shortcuts (Esc to Exit, Space for Pause, R for Reset) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          handleQuit();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        handleQuit();
      } else if (e.key === ' ' && phase === 'running' && !finished) {
        e.preventDefault();
        setIsRunning(prev => !prev);
      } else if ((e.key === 'r' || e.key === 'R') && phase === 'running' && !finished) {
        e.preventDefault();
        setIsRunning(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeLeft(totalSecs);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, finished, totalSecs, handleQuit]);

  // Track fullscreen state change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // --- Timer tick loop ---
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            setFinished(true);
            ambientSynth.playCompletionChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  // Document title updates
  useEffect(() => {
    if (finished) {
      document.title = '✓ Focus Completed — Sakido';
    } else if (phase === 'running') {
      document.title = `${formatTime(timeLeft)} — ${isRunning ? 'Focusing' : 'Paused'} · Sakido`;
    } else {
      document.title = 'Sakido Focus';
    }
    return () => {
      document.title = 'Sakido';
    };
  }, [timeLeft, phase, finished, isRunning]);

  // Actions
  const handleStart = () => {
    const mins = parseInt(inputMinutes, 10);
    if (isNaN(mins) || mins < 1 || mins > 600) return;
    const secs = mins * 60;
    setTotalSecs(secs);
    setTimeLeft(secs);
    setFinished(false);
    setPhase('running');
    setIsRunning(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimeLeft(totalSecs);
    setFinished(false);
  };

  const handleRestartNew = () => {
    setPhase('setup');
    setIsRunning(false);
    setFinished(false);
  };

  const adjustMinutes = (delta: number) => {
    const cur = parseInt(inputMinutes, 10) || 25;
    const next = Math.max(1, Math.min(300, cur + delta));
    setInputMinutes(String(next));
  };

  // Ring geometry
  const radius = 135;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSecs > 0 ? (totalSecs - timeLeft) / totalSecs : 0;
  const strokeDashoffset = circumference * (1 - progress);

  // Compute angle for tip dot
  const angle = progress * 360 - 90;
  const angleRad = (angle * Math.PI) / 180;
  const dotX = 160 + radius * Math.cos(angleRad);
  const dotY = 160 + radius * Math.sin(angleRad);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#09090b] text-zinc-100 flex flex-col items-center justify-between p-6 md:p-10 select-none overflow-hidden font-sans">
      {/* Background Ambient Glow */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 transition-all duration-1000"
        style={{
          background: isRunning 
            ? 'radial-gradient(circle at 50% 45%, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.04) 45%, transparent 70%)' 
            : finished 
            ? 'radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.15) 0%, transparent 65%)'
            : 'radial-gradient(circle at 50% 45%, rgba(120, 119, 198, 0.08) 0%, transparent 65%)'
        }}
      />

      {/* --- TOP HEADER BAR --- */}
      <header className="w-full max-w-4xl flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-zinc-300 flex items-center gap-2">
              Focus Zone
              {isRunning && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Active
                </span>
              )}
            </span>
            <p className="text-[11px] text-zinc-500">Sakido Zenith Protocol</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all active:scale-95"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleQuit}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-all active:scale-95 group"
            title="Press Esc to exit"
          >
            <X className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
            <span>Exit</span>
            <kbd className="hidden sm:inline-block ml-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">ESC</kbd>
          </button>
        </div>
      </header>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="w-full max-w-lg flex flex-col items-center justify-center z-10 my-auto">
        {phase === 'setup' ? (
          /* SETUP MODE */
          <div className="w-full flex flex-col items-center space-y-8 animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-amber-400/90">
                Zenith Timer
              </span>
              <h1 className="text-3xl md:text-4xl font-semibold text-zinc-100 tracking-tight">
                Select Focus Duration
              </h1>
              <p className="text-sm text-zinc-400 max-w-xs mx-auto">
                Set your target time and immerse yourself in distraction-free deep work.
              </p>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-5 gap-2 w-full">
              {PRESETS.map(p => {
                const isSelected = inputMinutes === String(p.minutes);
                return (
                  <button
                    key={p.label}
                    onClick={() => setInputMinutes(String(p.minutes))}
                    className={`flex flex-col items-center justify-center py-3 px-1 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-lg shadow-amber-500/20 scale-[1.03]'
                        : 'bg-zinc-900/60 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80'
                    }`}
                  >
                    <span className="text-sm font-semibold">{p.label}</span>
                    <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-zinc-900 font-medium' : 'text-zinc-500'}`}>
                      {p.tag}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom duration controls */}
            <div className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Custom Duration</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => adjustMinutes(-5)}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="flex items-baseline gap-1">
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={inputMinutes}
                    onChange={e => setInputMinutes(e.target.value)}
                    className="w-16 text-center text-2xl font-bold bg-transparent text-amber-400 focus:outline-none font-mono"
                  />
                  <span className="text-xs text-zinc-500 font-medium">min</span>
                </div>

                <button
                  onClick={() => adjustMinutes(5)}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Ambient Sound Selection Quick Bar */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Waves className="w-3.5 h-3.5 text-amber-400" />
                  Background Audio
                </span>
                {activeSound !== 'none' && (
                  <span className="text-[10px] text-amber-400 font-semibold">Active</span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'none', label: 'Silent', icon: <VolumeX className="w-3.5 h-3.5" /> },
                  { id: 'rain', label: 'Rain', icon: <CloudRain className="w-3.5 h-3.5" /> },
                  { id: 'binaural', label: 'Alpha', icon: <Waves className="w-3.5 h-3.5" /> },
                  { id: 'brownian', label: 'Deep', icon: <Wind className="w-3.5 h-3.5" /> },
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (s.id === 'none') {
                        ambientSynth.stop();
                        setActiveSound('none');
                      } else {
                        handleToggleSound(s.id as any);
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-xs font-medium transition-all ${
                      activeSound === s.id
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    }`}
                  >
                    {s.icon}
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStart}
              disabled={!inputMinutes || parseInt(inputMinutes) < 1}
              className="w-full flex items-center justify-center gap-2.5 bg-amber-400 text-zinc-950 py-4 rounded-2xl font-bold text-base tracking-wide hover:bg-amber-300 transition-all shadow-xl shadow-amber-500/20 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5 fill-current" />
              Begin Focus Session
            </button>
          </div>
        ) : finished ? (
          /* FINISHED MODE */
          <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                Session Accomplished
              </span>
              <h1 className="text-4xl md:text-5xl font-mono font-bold text-zinc-100">
                {formatTime(totalSecs)}
              </h1>
              <p className="text-sm text-zinc-400">
                Great job! You stayed focused for {Math.round(totalSecs / 60)} minute{totalSecs / 60 !== 1 ? 's' : ''}.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleRestartNew}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-sm font-semibold transition-all active:scale-95"
              >
                <RotateCcw className="w-4 h-4 text-zinc-400" />
                New Session
              </button>
              <button
                onClick={handleQuit}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-sm font-bold transition-all active:scale-95 shadow-lg shadow-amber-500/20"
              >
                Return to Workspace
              </button>
            </div>
          </div>
        ) : (
          /* RUNNING MODE */
          <div className="flex flex-col items-center space-y-8 w-full">
            {/* Status pill */}
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 backdrop-blur-md shadow-md">
              <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-amber-400 animate-ping' : 'bg-zinc-500'}`} />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                {isRunning ? 'Deep Focus Session' : 'Session Paused'}
              </span>
            </div>

            {/* SVG Ring + Countdown */}
            <div className="relative w-80 h-80 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 320 320">
                {/* Background Ring Track */}
                <circle
                  cx="160"
                  cy="160"
                  r={radius}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="6"
                />

                {/* Progress Ring Stroke */}
                <circle
                  cx="160"
                  cy="160"
                  r={radius}
                  fill="none"
                  stroke="url(#focusGradient)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-linear"
                />

                {/* Glowing Dot tip */}
                {progress > 0 && progress < 1 && (
                  <circle
                    cx={dotX}
                    cy={dotY}
                    r="5"
                    fill="#fbbf24"
                    className="filter drop-shadow-[0_0_8px_#fbbf24]"
                  />
                )}

                {/* Gradients */}
                <defs>
                  <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Time Display */}
              <div className="absolute flex flex-col items-center justify-center space-y-1">
                <span className="text-5xl md:text-6xl font-mono font-light tracking-tighter text-zinc-100 tabular-nums">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-xs font-medium text-zinc-500 font-mono">
                  Target: {formatTime(totalSecs)} ({Math.round(progress * 100)}%)
                </span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center gap-3 z-20">
              {/* Reset */}
              <button
                onClick={handleReset}
                title="Reset timer (R)"
                className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all active:scale-95"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {/* Play / Pause Main CTA */}
              <button
                onClick={() => setIsRunning(r => !r)}
                className={`flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold transition-all shadow-xl active:scale-95 ${
                  isRunning
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 shadow-amber-500/10'
                    : 'bg-amber-400 text-zinc-950 hover:bg-amber-300 shadow-amber-500/20'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause Session</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Resume Focus</span>
                  </>
                )}
              </button>

              {/* Ambient Sound Trigger */}
              <button
                onClick={() => setShowSoundControls(s => !s)}
                title="Soundscapes"
                className={`p-3.5 rounded-2xl border transition-all active:scale-95 ${
                  activeSound !== 'none'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                    : 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Waves className="w-5 h-5" />
              </button>
            </div>

            {/* Ambient Sound Controls Popover */}
            {showSoundControls && (
              <div className="w-full max-w-sm bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Ambient Audio Synthesizer
                  </span>
                  <span className="text-[10px] text-zinc-500">Real-time Web Audio</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'none', label: 'Off', icon: <VolumeX className="w-3.5 h-3.5" /> },
                    { id: 'rain', label: 'Rain', icon: <CloudRain className="w-3.5 h-3.5" /> },
                    { id: 'binaural', label: 'Alpha', icon: <Waves className="w-3.5 h-3.5" /> },
                    { id: 'brownian', label: 'Deep', icon: <Wind className="w-3.5 h-3.5" /> },
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (s.id === 'none') {
                          ambientSynth.stop();
                          setActiveSound('none');
                        } else {
                          handleToggleSound(s.id as any);
                        }
                      }}
                      className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border text-[11px] font-medium transition-all ${
                        activeSound === s.id
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                      }`}
                    >
                      {s.icon}
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>

                {activeSound !== 'none' && (
                  <div className="pt-2 border-t border-zinc-800/60 flex items-center gap-3">
                    <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={e => handleVolumeChange(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer h-1 bg-zinc-800 rounded-lg"
                    />
                    <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- FOOTER HINTS --- */}
      <footer className="w-full max-w-4xl flex items-center justify-between text-[11px] text-zinc-500 z-10">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[10px]">ESC</kbd> Exit
          </span>
          {phase === 'running' && (
            <>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[10px]">SPACE</kbd> Pause/Resume
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[10px]">R</kbd> Reset
              </span>
            </>
          )}
        </div>

        <span className="hidden md:inline text-zinc-600">
          Sakido Focus Workspace
        </span>
      </footer>
    </div>
  );
};
