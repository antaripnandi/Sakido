import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { FocusSessionConfig } from './FocusTimerView';

interface FocusTimerProps {
  config?: FocusSessionConfig;
  onClose: () => void;
}

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
  config = {
    mode: 'normal',
    durationMinutes: 25,
    pomodoroRatio: '5:1',
    pomoFocusMinutes: 25,
    pomoBreakMinutes: 5,
    pomodoroCycles: 4,
    sound: 'none',
    volume: 0,
  },
  onClose,
}) => {
  const isPomodoro = config.mode === 'pomodoro';
  const pomoFocusMins = config.pomoFocusMinutes || 25;
  const pomoBreakMins = config.pomoBreakMinutes || 5;

  // Pomodoro stage tracking
  const [currentCycle, setCurrentCycle] = useState(1);
  const [stage, setStage] = useState<'focus' | 'break'>('focus');

  // Exit confirmation modal state
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

  // Time calculations
  const getStageTotalSecs = (st: 'focus' | 'break') => {
    if (!isPomodoro) return config.durationMinutes * 60;
    return (st === 'focus' ? pomoFocusMins : pomoBreakMins) * 60;
  };

  const [totalSecs, setTotalSecs] = useState(getStageTotalSecs('focus'));
  const [timeLeft, setTimeLeft] = useState(getStageTotalSecs('focus'));
  const [isRunning, setIsRunning] = useState(true);
  const [finished, setFinished] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Attempt fullscreen on start
  useEffect(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

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

  // --- Direct quit after confirmation ---
  const handleQuitConfirm = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    exitFullscreen();
    onClose();
  }, [exitFullscreen, onClose]);

  // --- Trigger Quit with Confirmation Warning ---
  const handleRequestQuit = useCallback(() => {
    if (finished) {
      handleQuitConfirm();
    } else {
      setIsRunning(false);
      setIsExitConfirmOpen(true);
    }
  }, [finished, handleQuitConfirm]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          handleRequestQuit();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        handleRequestQuit();
      } else if (e.key === ' ' && !finished && !isExitConfirmOpen) {
        e.preventDefault();
        setIsRunning(prev => !prev);
      } else if ((e.key === 'r' || e.key === 'R') && !finished && !isExitConfirmOpen) {
        e.preventDefault();
        setIsRunning(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeLeft(totalSecs);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finished, totalSecs, isExitConfirmOpen, handleRequestQuit]);

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
    if (isRunning && timeLeft > 0 && !isExitConfirmOpen) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);

            // Handle Pomodoro Stage Transition
            if (isPomodoro) {
              if (stage === 'focus') {
                // Switch to Break
                setStage('break');
                const bSecs = pomoBreakMins * 60;
                setTotalSecs(bSecs);
                return bSecs;
              } else {
                // Break ended -> Next cycle focus or Finish
                if (currentCycle < config.pomodoroCycles) {
                  setCurrentCycle(c => c + 1);
                  setStage('focus');
                  const fSecs = pomoFocusMins * 60;
                  setTotalSecs(fSecs);
                  return fSecs;
                } else {
                  // All cycles complete!
                  setIsRunning(false);
                  setFinished(true);
                  return 0;
                }
              }
            } else {
              // Normal timer finished
              setIsRunning(false);
              setFinished(true);
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft, stage, isPomodoro, currentCycle, config.pomodoroCycles, pomoFocusMins, pomoBreakMins, isExitConfirmOpen]);

  // Document title updates
  useEffect(() => {
    if (finished) {
      document.title = '✓ Focus Completed — Sakido';
    } else {
      const stageLabel = isPomodoro ? (stage === 'focus' ? `Focus C${currentCycle}` : `Break C${currentCycle}`) : 'Focus';
      document.title = `${formatTime(timeLeft)} — ${stageLabel} · Sakido`;
    }
    return () => {
      document.title = 'Sakido';
    };
  }, [timeLeft, finished, stage, currentCycle, isPomodoro]);

  const handleReset = () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const secs = getStageTotalSecs(stage);
    setTotalSecs(secs);
    setTimeLeft(secs);
    setFinished(false);
  };

  // Ring progress calculations
  const circumference = 301.59;
  const progress = totalSecs > 0 ? (totalSecs - timeLeft) / totalSecs : 0;
  const strokeDashoffset = circumference * (1 - progress);

  // Compute angle for dynamic progress indicator dot (r=48, center=50,50)
  const angle = progress * 360 - 90;
  const angleRad = (angle * Math.PI) / 180;
  const dotX = 50 + 48 * Math.cos(angleRad);
  const dotY = 50 + 48 * Math.sin(angleRad);

  return (
    <div className="fixed inset-0 z-[9999] bg-background text-on-background min-h-screen flex flex-col font-body-md overflow-hidden select-none">
      {/* Top Bar */}
      <header className="w-full flex justify-between items-center px-4 md:px-10 py-4 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-outline-variant text-primary">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              timer
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-syne text-lg font-semibold text-primary tracking-tight">Focus</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-outline-variant text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleRequestQuit}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest transition-colors font-body-sm text-sm justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            <span>Exit</span>
            <span className="px-1.5 py-0.5 rounded border border-outline-variant text-[10px] bg-surface-container font-mono ml-1">
              ESC
            </span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center relative z-10 w-full px-4 pt-4">
        {finished ? (
          /* Finished State */
          <div className="flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>

            <div className="space-y-2">
              <span className="font-label-caps text-xs tracking-[0.2em] uppercase text-emerald-600 dark:text-emerald-400 font-bold">
                {isPomodoro ? 'Cycles complete' : 'Session complete'}
              </span>
              <h1 className="font-display text-5xl md:text-6xl font-bold text-primary tracking-tight">
                {isPomodoro ? `${config.pomodoroCycles} Cycles` : formatTime(totalSecs)}
              </h1>
              <p className="font-body-md text-on-surface-variant text-sm md:text-base">
                {isPomodoro
                  ? `${config.pomodoroCycles} cycles completed (${pomoFocusMins}m focus / ${pomoBreakMins}m rest).`
                  : `Focused for ${Math.round(totalSecs / 60)} minutes.`}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-3 rounded-full border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-all font-body-sm text-sm font-semibold cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">replay</span>
                Restart
              </button>
              <button
                type="button"
                onClick={handleQuitConfirm}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-on-primary font-headline-md text-sm font-bold shadow-md hover:opacity-90 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Active Countdown Mode */
          <div className="flex flex-col items-center justify-center">
            {/* Minimalist Stage Badge */}
            <div className="mb-6 px-4 py-1 rounded-full bg-surface-container border border-outline-variant/40 text-on-surface-variant font-mono text-xs tracking-tight opacity-90 font-medium flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${stage === 'break' ? 'bg-emerald-500 animate-pulse' : 'bg-primary'}`} />
              <span>
                {isPomodoro
                  ? `Cycle ${currentCycle} of ${config.pomodoroCycles} · ${stage === 'focus' ? 'Focus' : 'Rest'}`
                  : (isRunning ? 'Focus' : 'Paused')}
              </span>
            </div>

            {/* Circular Timer Container */}
            <div className="relative flex flex-col items-center justify-center w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 mb-8">
              {/* Progress Ring SVG */}
              <svg className="absolute inset-0 w-full h-full circular-progress" viewBox="0 0 100 100">
                {/* Track */}
                <circle
                  className="stroke-surface-container-highest"
                  cx="50"
                  cy="50"
                  fill="none"
                  r="48"
                  strokeWidth="2"
                />
                {/* Fill */}
                <circle
                  className={`${stage === 'break' ? 'stroke-emerald-500' : 'stroke-primary'} transition-all duration-1000 ease-linear`}
                  cx="50"
                  cy="50"
                  fill="none"
                  r="48"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  strokeWidth="2"
                />
                {/* Top Track Indicator */}
                <circle className={stage === 'break' ? 'fill-emerald-500' : 'fill-primary'} cx="50" cy="2" r="2" />
                {/* Dynamic Progress Tip Dot */}
                {progress > 0 && progress < 1 && (
                  <circle className={stage === 'break' ? 'fill-emerald-500' : 'fill-primary'} cx={dotX} cy={dotY} r="2.5" />
                )}
              </svg>

              {/* Time Display */}
              <div className="flex flex-col items-center justify-center z-10 text-center">
                <h1 className={`font-display text-[48px] md:text-[64px] tabular-nums tracking-tighter mb-1 font-extrabold ${
                  stage === 'break' ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'
                }`}>
                  {formatTime(timeLeft)}
                </h1>
                <span className="font-label-sm text-xs text-on-surface-variant opacity-70">
                  {stage === 'break' ? 'Resting...' : `Target ${formatTime(totalSecs)}`}
                </span>
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center gap-4 relative z-20">
              {/* Reset/Replay button */}
              <button
                type="button"
                onClick={handleReset}
                title="Reset timer (R)"
                className="flex items-center justify-center w-14 h-14 rounded-full border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary transition-all bg-surface-container-lowest cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-xl">replay</span>
              </button>

              {/* Main Pause / Resume CTA Button */}
              <button
                type="button"
                onClick={() => setIsRunning(r => !r)}
                className={`flex items-center gap-2 px-8 py-4 rounded-full text-on-primary hover:opacity-90 transition-opacity font-headline-md text-headline-md border border-primary shadow-md cursor-pointer font-bold ${
                  stage === 'break' ? 'bg-emerald-600 border-emerald-600' : 'bg-primary'
                }`}
              >
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {isRunning ? 'pause' : 'play_arrow'}
                </span>
                <span>{isRunning ? 'Pause' : 'Resume'}</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Status Bar */}
      <footer className="relative z-10 px-6 py-4 flex justify-between items-center opacity-60 font-label-sm text-xs text-on-surface">
        <div className="flex items-center gap-4">
          <span><kbd className="px-1 py-0.5 rounded border border-outline-variant font-mono text-[10px] bg-surface-container">ESC</kbd> Exit</span>
          <span><kbd className="px-1 py-0.5 rounded border border-outline-variant font-mono text-[10px] bg-surface-container">SPACE</kbd> Pause</span>
          <span><kbd className="px-1 py-0.5 rounded border border-outline-variant font-mono text-[10px] bg-surface-container">R</kbd> Reset</span>
        </div>
        <div>Sakido</div>
      </footer>

      {/* Exit Confirmation Modal (Same design as Logout modal) */}
      {isExitConfirmOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-[500px] bg-surface-container-lowest border border-outline-variant rounded-[32px] p-8 sm:p-10 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 text-on-surface">
            {/* Header Section */}
            <div className="flex items-start gap-5 mb-4">
              <AlertCircle className="w-8 h-8 text-on-surface mt-1 shrink-0" />
              <div>
                <h2 className="text-on-surface tracking-tight font-display font-bold text-2xl sm:text-3xl">Exit Focus Mode?</h2>
                <p className="font-manrope text-sm sm:text-base text-on-surface-variant font-medium">Active Timer Running</p>
              </div>
            </div>

            {/* Body Content */}
            <div className="sm:pl-[52px] mb-8">
              <p className="font-manrope text-base sm:text-lg text-on-surface leading-relaxed">
                Are you sure you want to end your focus session early?
              </p>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsExitConfirmOpen(false);
                  setIsRunning(true);
                }}
                className="w-full sm:w-auto px-8 py-3 border border-outline-variant text-on-surface font-manrope font-semibold text-base hover:bg-surface-container-highest transition-colors rounded-full cursor-pointer"
              >
                Keep Focusing
              </button>
              <button
                onClick={() => {
                  setIsExitConfirmOpen(false);
                  handleQuitConfirm();
                }}
                className="w-full sm:w-auto px-8 py-3 bg-primary-container text-on-primary font-display font-bold text-base hover:opacity-90 transition-opacity rounded-full cursor-pointer shadow-md"
              >
                Exit Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
