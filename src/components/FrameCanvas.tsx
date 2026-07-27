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
  const [loadedCount, setLoadedCount] = useState<number>(0);

  // Preload frame images from /frames/ folder in priority order
  useEffect(() => {
    let isMounted = true;
    let count = 0;

    const loadFrame = (index: number) => {
      const i = index + 1;
      const numStr = String(i).padStart(3, '0');
      const img = new Image();

      const handleLoad = () => {
        if (!isMounted) return;
        imagesRef.current[index] = img;
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
        count++;
        setLoadedCount(count);
        const progress = Math.min(100, Math.round((count / totalFrames) * 100));
        if (onPreloadProgress) onPreloadProgress(progress);
      };

      img.onload = handleLoad;
      img.onerror = handleError;
      img.src = `/frames/ezgif-frame-${numStr}.jpg`;

      if (img.complete && img.naturalWidth > 0) {
        handleLoad();
      }
    };

    // Load all 240 frames
    for (let i = 0; i < totalFrames; i++) {
      loadFrame(i);
    }

    return () => {
      isMounted = false;
    };
  }, [totalFrames, onPreloadProgress]);

  // Draw frame on canvas with high quality cover scaling
  const drawFrame = useCallback(
    (frameIdx: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (width === 0 || height === 0) return;

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep black background matching Apple aesthetic
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const maxIndex = totalFrames - 1;
      const safeIndex = Math.max(0, Math.min(maxIndex, Math.round(frameIdx)));

      // Retrieve image or closest available loaded neighbor for seamless continuity
      let img = imagesRef.current[safeIndex];
      if (!img || !img.complete || img.naturalWidth === 0) {
        for (let offset = 1; offset < 40; offset++) {
          const prevIdx = safeIndex - offset;
          if (prevIdx >= 0 && imagesRef.current[prevIdx]?.complete && imagesRef.current[prevIdx]!.naturalWidth > 0) {
            img = imagesRef.current[prevIdx];
            break;
          }
          const nextIdx = safeIndex + offset;
          if (nextIdx < totalFrames && imagesRef.current[nextIdx]?.complete && imagesRef.current[nextIdx]!.naturalWidth > 0) {
            img = imagesRef.current[nextIdx];
            break;
          }
        }
      }

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
      }

      ctx.restore();
    },
    [totalFrames]
  );

  // Redraw smoothly on animation frame updates
  useEffect(() => {
    let animId = requestAnimationFrame(() => {
      drawFrame(currentFrame);
    });
    return () => cancelAnimationFrame(animId);
  }, [currentFrame, drawFrame, loadedCount]);

  // Handle window resize
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
    </div>
  );
};



