import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ambientSynth } from '../../utils/audioSynth';
import { FocusSessionConfig, PomodoroRatioKey } from './FocusTimerView';

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

const RATIO_TIMES: Record<PomodoroRatioKey, { focus: number; break: number }> = {
  '5:1': { focus: 25, break: 5 },
  '45:15': { focus: 45, break: 15 },
  '52:17': { focus: 52, break: 17 },
  '2:1': { focus: 30, break: 15 },
};

export const FocusTimer: React.FC<FocusTimerProps> = ({
  config = {
    mode: 'normal',
    durationMinutes: 25,
    pomodoroRatio: '5:1',
    pomodoroCycles: 4,
    sound: 'none',
    volume: 0.5,
  },
  onClose,
}) => {
  const isPomodoro = config.mode === 'pomodoro';
  const ratioDetails = RATIO_TIMES[config.pomodoroRatio] || RATIO_TIMES['5:1'];

  // Pomodoro stage tracking
  const [currentCycle, setCurrentCycle] = useState(1);
  const [stage, setStage] = useState<'focus' | 'break'>('focus');

  // Time calculations
  const getStageTotalSecs = (st: 'focus' | 'break') => {
    if (!isPomodoro) return config.durationMinutes * 60;
    return (st === 'focus' ? ratioDetails.focus : ratioDetails.break) * 60;
  };

  const [totalSecs, setTotalSecs] = useState(getStageTotalSecs('focus'));
  const [timeLeft, setTimeLeft] = useState(getStageTotalSecs('focus'));
  const [isRunning, setIsRunning] = useState(true);
  const [finished, setFinished] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Soundscape & Volume Popover State
  const [activeSound, setActiveSound] = useState<'none' | 'rain' | 'binaural' | 'brownian'>(config.sound);
  const [volume, setVolume] = useState(config.volume);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start sound on mount if configured
  useEffect(() => {
    if (config.sound && config.sound !== 'none') {
      ambientSynth.play(config.sound as 'rain' | 'binaural' | 'brownian');
      ambientSynth.setVolume(config.volume);
    }
    // Attempt fullscreen on start
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, [config.sound, config.volume]);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      ambientSynth.stop();
    };
  }, []);

  // --- Ambient sound toggle / cycle ---
  const handleCycleSound = () => {
    const sequence: ('none' | 'rain' | 'binaural' | 'brownian')[] = ['none', 'rain', 'binaural', 'brownian'];
    const nextIdx = (sequence.indexOf(activeSound) + 1) % sequence.length;
    const nextSound = sequence[nextIdx];
    
    if (nextSound === 'none') {
      ambientSynth.stop();
      setActiveSound('none');
    } else {
      setActiveSound(nextSound);
      ambientSynth.play(nextSound);
      ambientSynth.setVolume(volume);
    }
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    ambientSynth.setVolume(v);
  };

  const handleVolumeBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const newVol = Math.max(0, Math.min(1, 1 - clickY / rect.height));
    handleVolumeChange(Math.round(newVol * 100) / 100);
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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          handleQuit();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        handleQuit();
      } else if (e.key === ' ' && !finished) {
        e.preventDefault();
        setIsRunning(prev => !prev);
      } else if ((e.key === 'r' || e.key === 'R') && !finished) {
        e.preventDefault();
        setIsRunning(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeLeft(totalSecs);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finished, totalSecs, handleQuit]);

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
            ambientSynth.playCompletionChime();

            // Handle Pomodoro Stage Transition
            if (isPomodoro) {
              if (stage === 'focus') {
                // Switch to Break
                setStage('break');
                const bSecs = ratioDetails.break * 60;
                setTotalSecs(bSecs);
                return bSecs;
              } else {
                // Break ended -> Next cycle focus or Finish
                if (currentCycle < config.pomodoroCycles) {
                  setCurrentCycle(c => c + 1);
                  setStage('focus');
                  const fSecs = ratioDetails.focus * 60;
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
  }, [isRunning, timeLeft, stage, isPomodoro, currentCycle, config.pomodoroCycles, ratioDetails]);

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
          <div className="flex items-center justify-center w-12 h-12 rounded-full border border-outline-variant text-primary">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              timer
            </span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-syne text-lg font-semibold text-primary tracking-tight">FOCUS ZONE</span>
            </div>
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
            onClick={handleQuit}
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

      {/* Main Content (Timer) */}
      <main className="flex-grow flex flex-col items-center justify-center relative z-10 w-full px-4 pt-4">
        {finished ? (
          /* Finished State */
          <div className="flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>

            <div className="space-y-2">
              <span className="font-label-caps text-xs tracking-[0.2em] uppercase text-emerald-600 dark:text-emerald-400 font-bold">
                {isPomodoro ? 'All Pomodoro Cycles Accomplished 🎉' : 'Session Accomplished'}
              </span>
              <h1 className="font-display text-5xl md:text-6xl font-bold text-primary tracking-tight">
                {isPomodoro ? `${config.pomodoroCycles} Cycles Complete` : formatTime(totalSecs)}
              </h1>
              <p className="font-body-md text-on-surface-variant text-sm md:text-base">
                {isPomodoro
                  ? `Completed ${config.pomodoroCycles} cycles of ${config.pomodoroRatio} ratio Pomodoro!`
                  : `Great work! You stayed focused for ${Math.round(totalSecs / 60)} minutes.`}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-3 rounded-full border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-all font-body-sm text-sm font-semibold cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">replay</span>
                Restart Session
              </button>
              <button
                type="button"
                onClick={handleQuit}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-on-primary font-headline-md text-sm font-bold shadow-md hover:opacity-90 transition-all cursor-pointer"
              >
                Return to Workspace
              </button>
            </div>
          </div>
        ) : (
          /* Active Countdown Mode */
          <div className="flex flex-col items-center justify-center">
            {/* Session / Pomodoro Stage Badge */}
            <div className="mb-6 px-4 py-1 rounded-full bg-surface-container border border-outline-variant/40 text-on-surface-variant font-label-caps text-[10px] tracking-[0.2em] uppercase opacity-90 font-bold flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${stage === 'break' ? 'bg-emerald-500 animate-pulse' : 'bg-primary'}`} />
              <span>
                {isPomodoro
                  ? `CYCLE ${currentCycle} OF ${config.pomodoroCycles} · ${stage === 'focus' ? 'FOCUS SESSION' : 'REST BREAK ☕'}`
                  : (isRunning ? 'DEEP FOCUS SESSION' : 'SESSION PAUSED')}
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
                  {stage === 'break' ? 'Resting...' : `Target: ${formatTime(totalSecs)}`}
                </span>
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center gap-4 relative z-20">
              {/* Reset/Replay button */}
              <button
                type="button"
                onClick={handleReset}
                title="Replay / Reset Stage (R)"
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
                <span>{isRunning ? 'Pause Session' : 'Resume Session'}</span>
              </button>

              {/* Ambient Sound Selector Button */}
              <button
                type="button"
                onClick={handleCycleSound}
                title={`Ambient Audio: ${activeSound} (Click to cycle)`}
                className={`flex items-center justify-center w-14 h-14 rounded-full border transition-all cursor-pointer shadow-xs ${
                  activeSound !== 'none'
                    ? 'border-primary text-primary bg-primary-fixed-dim/20'
                    : 'border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary bg-surface-container-lowest'
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {activeSound === 'rain' ? 'water_drop' : activeSound === 'binaural' ? 'graphic_eq' : activeSound === 'brownian' ? 'filter_vintage' : 'water'}
                </span>
              </button>

              {/* Speaker / Volume Control Container */}
              <div className="relative z-30 flex flex-col items-center">
                {/* Volume Slider Popover (Hidden by default, shown ONLY when volume button is clicked) */}
                <div
                  id="volume-slider-container"
                  className={`absolute bottom-full mb-3 transition-all duration-200 h-44 w-12 bg-surface-container-highest rounded-2xl flex flex-col items-center justify-between py-3 shadow-xl border border-outline-variant z-40 ${
                    isVolumeOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
                  }`}
                >
                  <span className="text-[10px] font-mono text-on-surface-variant font-bold">
                    {Math.round(volume * 100)}%
                  </span>
                  
                  {/* Custom Vertical Volume Fill Bar */}
                  <div
                    onClick={handleVolumeBarClick}
                    className="h-24 w-2 bg-surface-container-lowest rounded-full relative cursor-pointer flex items-end overflow-hidden"
                  >
                    <div
                      className="w-full bg-primary rounded-full transition-all"
                      style={{ height: `${volume * 100}%` }}
                    />
                  </div>

                  {/* Native Range Slider styled vertically for Accessibility */}
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="focus-slider cursor-pointer w-20 opacity-0 absolute inset-0 h-full"
                  />
                </div>

                {/* Speaker Icon Button */}
                <button
                  type="button"
                  onClick={() => setIsVolumeOpen(v => !v)}
                  title="Toggle Volume Control"
                  className={`flex items-center justify-center w-14 h-14 rounded-full border transition-all bg-surface-container-lowest shadow-xs cursor-pointer ${
                    isVolumeOpen
                      ? 'text-primary border-primary ring-2 ring-primary/20'
                      : 'border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">
                    {volume === 0 ? 'volume_off' : 'volume_up'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Status Bar */}
      <footer className="relative z-10 px-6 py-4 flex justify-between items-center opacity-60 font-label-sm text-xs text-on-surface">
        <div className="flex items-center gap-4">
          <span><kbd className="px-1 py-0.5 rounded border border-outline-variant font-mono text-[10px] bg-surface-container">ESC</kbd> Exit</span>
          <span><kbd className="px-1 py-0.5 rounded border border-outline-variant font-mono text-[10px] bg-surface-container">SPACE</kbd> Pause/Resume</span>
          <span><kbd className="px-1 py-0.5 rounded border border-outline-variant font-mono text-[10px] bg-surface-container">R</kbd> Reset</span>
        </div>
        <div>Sakido Zenith Protocol</div>
      </footer>
    </div>
  );
};
