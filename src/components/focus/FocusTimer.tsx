import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, RotateCcw, Timer } from 'lucide-react';

interface FocusTimerProps {
  onClose: () => void;
}

type Phase = 'setup' | 'running';

const PRESETS = [
  { label: '25m', minutes: 25 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '90m', minutes: 90 },
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

export const FocusTimer: React.FC<FocusTimerProps> = ({ onClose }) => {
  const [phase, setPhase] = useState<Phase>('setup');
  const [inputMinutes, setInputMinutes] = useState<string>('25');
  const [totalSecs, setTotalSecs] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Fullscreen ---
  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Lock user in: intercept fullscreen exit attempts while running
  useEffect(() => {
    if (phase !== 'running') return;

    const handleFullscreenChange = () => {
      // If user pressed Esc to exit fullscreen but we're still running, re-enter
      if (!document.fullscreenElement && phase === 'running') {
        // Small delay so browser doesn't block the re-request immediately
        setTimeout(() => enterFullscreen(), 100);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [phase, enterFullscreen]);

  // Prevent keyboard shortcuts that could leave the page while running
  useEffect(() => {
    if (phase !== 'running') return;

    const block = (e: KeyboardEvent) => {
      // Block Alt+F4 equivalent, F11, etc. — can't fully block OS shortcuts
      // but we can block things like Ctrl+W, Ctrl+R, Backspace nav
      if (
        (e.ctrlKey && (e.key === 'w' || e.key === 'r' || e.key === 'l')) ||
        (e.altKey && e.key === 'F4') ||
        e.key === 'F5'
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', block);
    return () => window.removeEventListener('keydown', block);
  }, [phase]);

  // --- Timer tick ---
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            setFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  // Notify with title when finished
  useEffect(() => {
    if (finished) {
      document.title = '✓ Focus session complete — Sakido';
      exitFullscreen();
    }
  }, [finished, exitFullscreen]);

  // Restore title on unmount
  useEffect(() => {
    return () => {
      document.title = 'Sakido';
    };
  }, []);

  // Update document title with countdown while running
  useEffect(() => {
    if (phase === 'running' && !finished) {
      document.title = `${formatTime(timeLeft)} — Focus · Sakido`;
    }
  }, [timeLeft, phase, finished]);

  // --- Actions ---
  const handleStart = () => {
    const mins = parseInt(inputMinutes, 10);
    if (isNaN(mins) || mins < 1 || mins > 600) return;
    const secs = mins * 60;
    setTotalSecs(secs);
    setTimeLeft(secs);
    setFinished(false);
    setPhase('running');
    setIsRunning(true);
    enterFullscreen();
  };

  const handleQuit = () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    exitFullscreen();
    onClose();
  };

  const handleReset = () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimeLeft(totalSecs);
    setFinished(false);
  };

  const handleRestart = () => {
    setPhase('setup');
    setIsRunning(false);
    setFinished(false);
    exitFullscreen();
  };

  const progress = totalSecs > 0 ? (totalSecs - timeLeft) / totalSecs : 0;
  const circumference = 2 * Math.PI * 120;
  const dashOffset = circumference * (1 - progress);

  // --- Setup screen ---
  if (phase === 'setup') {
    return (
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9999] bg-[#fff8f5] dark:bg-[#1a1411] flex flex-col items-center justify-center"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-[#51443c] hover:text-[#1f1b18] hover:bg-[#f6ece7] dark:text-[#a89080] dark:hover:text-[#ebe0db] dark:hover:bg-[#2a201a] transition-colors"
          aria-label="Close focus timer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center gap-10 w-full max-w-sm px-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Timer className="w-5 h-5 text-[#8b5e3c]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8b5e3c]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Focus Session
              </span>
            </div>
            <h1
              className="text-4xl font-bold text-[#1f1b18] dark:text-[#ebe0db] tracking-tight"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              How long?
            </h1>
            <p className="text-sm text-[#51443c] dark:text-[#a89080]">
              Once started, the screen locks until you quit.
            </p>
          </div>

          {/* Presets */}
          <div className="flex gap-3 w-full justify-center">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => setInputMinutes(String(p.minutes))}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                  inputMinutes === String(p.minutes)
                    ? 'bg-[#8b5e3c] text-white border-[#8b5e3c]'
                    : 'bg-transparent text-[#51443c] dark:text-[#a89080] border-[#d5c3b8] dark:border-[#3a2e28] hover:border-[#8b5e3c] hover:text-[#8b5e3c]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div className="w-full space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#83746b] dark:text-[#7a6a60]">
              Custom (minutes)
            </label>
            <input
              type="number"
              min={1}
              max={600}
              value={inputMinutes}
              onChange={e => setInputMinutes(e.target.value)}
              className="w-full border border-[#d5c3b8] dark:border-[#3a2e28] rounded-lg px-4 py-3 text-2xl font-bold text-center text-[#1f1b18] dark:text-[#ebe0db] bg-transparent focus:outline-none focus:border-[#8b5e3c] transition-colors"
              style={{ fontFamily: 'Syne, sans-serif' }}
            />
          </div>

          {/* Start */}
          <button
            onClick={handleStart}
            disabled={!inputMinutes || parseInt(inputMinutes) < 1}
            className="w-full flex items-center justify-center gap-2.5 bg-[#1f1b18] dark:bg-[#ebe0db] text-[#fff8f5] dark:text-[#1f1b18] py-4 rounded-xl text-sm font-bold tracking-wide transition-all hover:bg-[#8b5e3c] dark:hover:bg-[#f4bb92] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Focus
          </button>
        </div>
      </div>
    );
  }

  // --- Running / finished screen ---
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] bg-[#fff8f5] dark:bg-[#1a1411] flex flex-col items-center justify-center select-none"
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      {/* Quit button — always visible */}
      <button
        onClick={handleQuit}
        className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#51443c] dark:text-[#a89080] border border-[#d5c3b8] dark:border-[#3a2e28] hover:border-[#8b5e3c] hover:text-[#8b5e3c] transition-colors"
        aria-label="Quit focus session"
      >
        <X className="w-3.5 h-3.5" />
        Quit
      </button>

      {finished ? (
        /* Finished state */
        <div className="flex flex-col items-center gap-8 text-center px-8">
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8b5e3c]">Session complete</p>
            <h1
              className="text-5xl font-bold text-[#1f1b18] dark:text-[#ebe0db]"
              style={{ fontFamily: 'Syne, sans-serif' }}
            >
              {formatTime(totalSecs)}
            </h1>
            <p className="text-sm text-[#51443c] dark:text-[#a89080]">
              You focused for {Math.round(totalSecs / 60)} minute{totalSecs / 60 !== 1 ? 's' : ''}.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border border-[#d5c3b8] dark:border-[#3a2e28] text-[#51443c] dark:text-[#a89080] hover:border-[#8b5e3c] hover:text-[#8b5e3c] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              New session
            </button>
            <button
              onClick={handleQuit}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-[#1f1b18] dark:bg-[#ebe0db] text-[#fff8f5] dark:text-[#1f1b18] hover:bg-[#8b5e3c] dark:hover:bg-[#f4bb92] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        /* Active countdown */
        <div className="flex flex-col items-center gap-10">
          {/* Label */}
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#8b5e3c]">
            {isRunning ? 'Stay focused' : 'Paused'}
          </p>

          {/* Ring + Time */}
          <div className="relative w-72 h-72 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 272 272">
              {/* Track */}
              <circle
                cx="136" cy="136" r="120"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-[#ebe0db] dark:text-[#2a201a]"
              />
              {/* Progress */}
              <circle
                cx="136" cy="136" r="120"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="text-[#1f1b18] dark:text-[#ebe0db] transition-all duration-1000 ease-linear"
              />
            </svg>

            <div className="flex flex-col items-center gap-1">
              <span
                className="text-6xl font-bold tabular-nums text-[#1f1b18] dark:text-[#ebe0db] tracking-tight"
                style={{ fontFamily: 'Syne, sans-serif' }}
              >
                {formatTime(timeLeft)}
              </span>
              <span className="text-xs text-[#83746b] dark:text-[#7a6a60]">
                of {formatTime(totalSecs)}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleReset}
              className="p-3 rounded-xl border border-[#d5c3b8] dark:border-[#3a2e28] text-[#83746b] dark:text-[#7a6a60] hover:border-[#8b5e3c] hover:text-[#8b5e3c] transition-colors"
              aria-label="Reset timer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsRunning(r => !r)}
              className={`flex items-center gap-2.5 px-10 py-3.5 rounded-xl text-sm font-bold transition-all ${
                isRunning
                  ? 'bg-[#f6ece7] dark:bg-[#2a201a] text-[#8b5e3c] border border-[#d5c3b8] dark:border-[#3a2e28] hover:bg-[#f1e6e1]'
                  : 'bg-[#1f1b18] dark:bg-[#ebe0db] text-[#fff8f5] dark:text-[#1f1b18] hover:bg-[#8b5e3c] dark:hover:bg-[#f4bb92]'
              }`}
            >
              {isRunning
                ? <><Pause className="w-4 h-4 fill-current" /> Pause</>
                : <><Play className="w-4 h-4 fill-current" /> Resume</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
