import React, { useEffect, useRef, useState, useCallback } from 'react';

interface FrameCanvasProps {
  currentFrame: number; // 0 to totalFrames - 1
  totalFrames?: number;
  className?: string;
  onPreloadProgress?: (progress: number) => void;
}

export const FrameCanvas: React.FC<FrameCanvasProps> = ({
  currentFrame,
  totalFrames = 240,
  className = '',
  onPreloadProgress,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>(new Array(totalFrames).fill(null));
  const hiddenImagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [loadedCount, setLoadedCount] = useState<number>(0);

  // Preload all frame images from /frames/ folder
  useEffect(() => {
    let isMounted = true;
    let count = 0;

    for (let i = 1; i <= totalFrames; i++) {
      const img = new Image();
      const numStr = String(i).padStart(3, '0');
      img.src = `/frames/ezgif-frame-${numStr}.jpg`;

      const handleLoad = () => {
        if (!isMounted) return;
        imagesRef.current[i - 1] = img;
        count++;
        setLoadedCount(count);
        const progress = Math.min(100, Math.round((count / totalFrames) * 100));
        if (onPreloadProgress) onPreloadProgress(progress);

        if ('decode' in img) {
          img.decode().catch(() => {});
        }
      };

      const handleError = () => {
        if (!isMounted) return;
        imagesRef.current[i - 1] = null;
        count++;
        setLoadedCount(count);
        const progress = Math.min(100, Math.round((count / totalFrames) * 100));
        if (onPreloadProgress) onPreloadProgress(progress);
      };

      if (img.complete && img.naturalWidth > 0) {
        handleLoad();
      } else {
        img.onload = handleLoad;
        img.onerror = handleError;
      }
    }

    return () => {
      isMounted = false;
    };
  }, [totalFrames, onPreloadProgress]);

  // Draw frame on canvas with cover scaling, or render high-fidelity vector placeholder bag
  const drawFrame = useCallback(
    (frameIdx: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (width === 0 || height === 0) return;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep dark background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      const maxIndex = totalFrames - 1;
      const safeIndex = Math.max(0, Math.min(maxIndex, Math.round(frameIdx)));
      const img = imagesRef.current[safeIndex];

      if (img && img.complete && img.naturalWidth > 0) {
        // Draw frame image scaled to cover canvas
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const canvasRatio = width / height;

        let drawWidth = width;
        let drawHeight = height;

        if (canvasRatio > imgRatio) {
          drawWidth = width;
          drawHeight = width / imgRatio;
        } else {
          drawHeight = height;
          drawWidth = height * imgRatio;
        }

        const dx = (width - drawWidth) / 2;
        const dy = (height - drawHeight) / 2;

        ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
      } else {
        // Visual Device Fallback: Minimalist Bag opening & unpacking contents
        const progress = safeIndex / maxIndex; // 0 to 1
        const centerX = width / 2;
        const centerY = height / 2 + 20;
        const bagWidth = Math.min(width * 0.4, 280);
        const bagHeight = bagWidth * 1.25;

        ctx.save();
        ctx.translate(centerX, centerY);

        // Bag body base
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(18, 18, 20, 0.6)';

        const bx = -bagWidth / 2;
        const by = -bagHeight / 2 + 30;

        ctx.beginPath();
        ctx.roundRect(bx, by, bagWidth, bagHeight, [16, 16, 28, 28]);
        ctx.fill();
        ctx.stroke();

        // Front pocket line
        ctx.beginPath();
        ctx.moveTo(bx + 16, by + bagHeight * 0.5);
        ctx.lineTo(bx + bagWidth - 16, by + bagHeight * 0.5);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.stroke();

        // Shoulder straps top hint
        ctx.beginPath();
        ctx.arc(0, by - 12, 32, Math.PI, 0);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.stroke();

        // Bag Flap opening up dynamically based on scroll progress
        const flapOpenAngle = Math.min(Math.PI * 0.85, progress * Math.PI * 1.1);
        ctx.save();
        ctx.translate(0, by);
        ctx.rotate(-flapOpenAngle);

        ctx.beginPath();
        ctx.roundRect(-bagWidth / 2, 0, bagWidth, bagHeight * 0.45, [16, 16, 6, 6]);
        ctx.fillStyle = 'rgba(30, 30, 35, 0.85)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Unpacking elements floating up as bag opens
        const items = [
          { label: 'Notes', icon: '📝', angle: -0.8, startP: 0.1 },
          { label: 'Calendar', icon: '📅', angle: -0.4, startP: 0.25 },
          { label: 'Tasks', icon: '✓', angle: 0, startP: 0.4 },
          { label: 'Inbox', icon: '🔗', angle: 0.4, startP: 0.55 },
          { label: 'Chat', icon: '💬', angle: 0.8, startP: 0.7 },
        ];

        items.forEach((item) => {
          if (progress > item.startP) {
            const itemP = Math.min(1, (progress - item.startP) / 0.25);
            const dist = itemP * 140;
            const ix = Math.sin(item.angle) * dist;
            const iy = by - Math.cos(item.angle) * dist - itemP * 20;

            ctx.save();
            ctx.translate(ix, iy);
            ctx.globalAlpha = itemP;

            // Simple item node
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(0, 0, 22, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.icon, 0, 0);

            ctx.restore();
          }
        });

        ctx.restore();
      }

      ctx.restore();
    },
    [totalFrames]
  );

  // Redraw when frame index or loaded count changes
  useEffect(() => {
    drawFrame(currentFrame);
  }, [currentFrame, drawFrame, loadedCount]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      drawFrame(currentFrame);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentFrame, drawFrame]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Hidden container for preloaded images */}
      <div
        ref={hiddenImagesContainerRef}
        aria-hidden="true"
        className="fixed top-0 left-0 w-1 h-1 opacity-0 pointer-events-none overflow-hidden -z-50"
      >
        {Array.from({ length: totalFrames }).map((_, idx) => {
          const numStr = String(idx + 1).padStart(3, '0');
          return (
            <img
              key={numStr}
              src={`/frames/ezgif-frame-${numStr}.jpg`}
              alt=""
              loading="eager"
              decoding="async"
            />
          );
        })}
      </div>
    </div>
  );
};


