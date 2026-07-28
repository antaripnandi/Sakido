import React, { useEffect, useRef, useState, useCallback } from 'react';
import { renderBackpackFrame } from '../../utils/backpackSequenceRenderer';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

export const SequenceScrollSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const playIntervalRef = useRef<number | null>(null);

  // Synchronize canvas rendering with clamped device pixel ratio (prevents high-DPI canvas lag on laptops/mobiles)
  const renderCanvas = useCallback((frame: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const rect = canvas.getBoundingClientRect();

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    renderBackpackFrame(ctx, frame, rect.width, rect.height, {
      showLabels: true,
    });
    ctx.restore();
  }, []);

  // 6 Snap Steps mapping
  const STEP_FRAMES = [
    { label: '01 Overview', frame: 0 },
    { label: '02 Notes', frame: 48 },
    { label: '03 Tasks', frame: 96 },
    { label: '04 Calendar', frame: 144 },
    { label: '05 Watch Later', frame: 192 },
    { label: '06 Connectors', frame: 239 },
  ];

  // Animated frame transition helper
  const animateToFrame = useCallback((targetFrame: number) => {
    let current = currentFrame;
    const step = targetFrame > current ? 3 : -3;

    const animLoop = () => {
      if (Math.abs(targetFrame - current) <= 3) {
        setCurrentFrame(targetFrame);
        renderCanvas(targetFrame);
        return;
      }
      current += step;
      setCurrentFrame(current);
      renderCanvas(current);
      requestAnimationFrame(animLoop);
    };

    requestAnimationFrame(animLoop);
  }, [currentFrame, renderCanvas]);

  // Handle scroll progress mapping to frame index 0 - 239
  useEffect(() => {
    let rafId: number | null = null;

    const handleScroll = () => {
      if (isPlaying) return;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const totalScrollableDistance = rect.height - viewportHeight;

      if (totalScrollableDistance <= 0) return;

      const currentScroll = -rect.top;
      const progress = Math.max(0, Math.min(1, currentScroll / totalScrollableDistance));

      const targetFrame = Math.min(239, Math.max(0, Math.floor(progress * 240)));

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setCurrentFrame(targetFrame);
        renderCanvas(targetFrame);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', () => renderCanvas(currentFrame));

    renderCanvas(currentFrame);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [currentFrame, isPlaying, renderCanvas]);

  // Handle Play/Pause Auto-sequence loop
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = window.setInterval(() => {
        setCurrentFrame((prev) => {
          const next = prev >= 239 ? 0 : prev + 1;
          renderCanvas(next);
          return next;
        });
      }, 1000 / 30); // 30 FPS smooth sequence
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, renderCanvas]);

  // Keyboard Frame Navigation (Arrow Left / Arrow Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentFrame((prev) => {
          const next = Math.min(239, prev + 1);
          renderCanvas(next);
          return next;
        });
      } else if (e.key === 'ArrowLeft') {
        setCurrentFrame((prev) => {
          const next = Math.max(0, prev - 1);
          renderCanvas(next);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [renderCanvas]);

  // Story text fade helper based on frame range
  const getStoryOpacity = (minFrame: number, maxFrame: number) => {
    if (currentFrame < minFrame - 15 || currentFrame > maxFrame + 15) return 0;
    if (currentFrame >= minFrame && currentFrame <= maxFrame) return 1;
    if (currentFrame < minFrame) {
      return (currentFrame - (minFrame - 15)) / 15;
    }
    return (maxFrame + 15 - currentFrame) / 15;
  };

  return (
    <div
      id="sequence-hero"
      ref={containerRef}
      className="relative w-full bg-white text-zinc-900"
      style={{ height: '550vh' }} // Generous 5.5x viewport scroll space for 240 frames
    >
      {/* Sticky Centered Product Reveal Frame */}
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-between py-12 px-6 overflow-hidden">
        
        {/* Top Floating Story Text Overlays */}
        <div className="relative w-full max-w-xl h-20 flex items-center justify-center text-center z-20">
          {/* Default Intro Story */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300"
            style={{ opacity: getStoryOpacity(0, 35) }}
          >
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
              The 240-Frame Product Reveal
            </h2>
            <p className="text-sm text-zinc-500 mt-1 font-normal">
              Scroll down to slowly unbox Sakido.
            </p>
          </div>

          {/* Story 1: Notes */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300"
            style={{ opacity: getStoryOpacity(40, 75) }}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">01 / NOTES</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900">
              Notes
            </h2>
            <p className="text-base text-zinc-600 mt-1.5 font-medium max-w-md">
              Capture ideas without distraction.
            </p>
          </div>

          {/* Story 2: Tasks */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300"
            style={{ opacity: getStoryOpacity(80, 115) }}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">02 / TASKS</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900">
              Tasks
            </h2>
            <p className="text-base text-zinc-600 mt-1.5 font-medium max-w-md">
              Stay organized without feeling overwhelmed.
            </p>
          </div>

          {/* Story 3: Calendar */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300"
            style={{ opacity: getStoryOpacity(120, 155) }}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">03 / CALENDAR</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900">
              Calendar
            </h2>
            <p className="text-base text-zinc-600 mt-1.5 font-medium max-w-md">
              Know what is next.
            </p>
          </div>

          {/* Story 4: Knowledge */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300"
            style={{ opacity: getStoryOpacity(160, 195) }}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">04 / KNOWLEDGE</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900">
              Knowledge
            </h2>
            <p className="text-base text-zinc-600 mt-1.5 font-medium max-w-md">
              Save everything worth remembering.
            </p>
          </div>

          {/* Story 5: AI */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300"
            style={{ opacity: getStoryOpacity(200, 239) }}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-1">05 / PRIVATE AI</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900">
              Bring Your Own AI
            </h2>
            <p className="text-base text-zinc-600 mt-1.5 font-medium max-w-md">
              Your notes stay yours. Connect local or private AI models.
            </p>
          </div>
        </div>

        {/* Center Canvas Stage (The 240-frame product sequence) */}
        <div className="relative w-full max-w-2xl h-[52vh] my-auto flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
          />
        </div>

        {/* Bottom Minimal Frame Scrubber & Playback Bar */}
        <div className="w-full max-w-md bg-zinc-50 border border-zinc-200 p-3 rounded-2xl flex items-center gap-3 shadow-xs z-30">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 transition-colors cursor-pointer flex-shrink-0"
            title={isPlaying ? 'Pause Auto Play' : 'Play 240 Frame Sequence'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          <button
            onClick={() => {
              setCurrentFrame(0);
              renderCanvas(0);
            }}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer flex-shrink-0"
            title="Reset to Frame 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Scrub Slider (0 to 239) */}
          <div className="flex-1 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={239}
              value={currentFrame}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setCurrentFrame(val);
                renderCanvas(val);
              }}
              className="w-full accent-zinc-900 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none"
            />
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 text-xs font-mono font-semibold text-zinc-600">
            <button
              onClick={() => {
                const prev = Math.max(0, currentFrame - 1);
                setCurrentFrame(prev);
                renderCanvas(prev);
              }}
              className="p-1 hover:text-zinc-900 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>{String(currentFrame + 1).padStart(3, '0')}</span>
            <button
              onClick={() => {
                const next = Math.min(239, currentFrame + 1);
                setCurrentFrame(next);
                renderCanvas(next);
              }}
              className="p-1 hover:text-zinc-900 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 6 Step Part Snapping Bar */}
        <div className="flex items-center justify-center gap-1.5 overflow-x-auto max-w-full px-4 py-1.5 z-30">
          {STEP_FRAMES.map((step, idx) => {
            const isActive = currentFrame >= step.frame && (idx === STEP_FRAMES.length - 1 || currentFrame < STEP_FRAMES[idx + 1].frame);
            return (
              <button
                key={step.label}
                onClick={() => animateToFrame(step.frame)}
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-zinc-900 text-white shadow-xs scale-105'
                    : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200'
                }`}
              >
                {step.label}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
