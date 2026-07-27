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

  // Preload frame images smoothly in priority order
  useEffect(() => {
    let isMounted = true;
    let completed = 0;

    const getFrameUrl = (index: number) => {
      const numStr = String(index + 1).padStart(3, '0');
      const baseUrl = (import.meta as any).env?.BASE_URL || '/';
      const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      return `${prefix}frames/ezgif-frame-${numStr}.jpg`;
    };

    const loadSingleFrame = (index: number, attempt = 0): Promise<void> => {
      return new Promise((resolve) => {
        if (!isMounted || imagesRef.current[index]) {
          resolve();
          return;
        }

        let resolved = false;
        const img = new Image();

        const handleSuccess = () => {
          if (resolved || !isMounted) return;
          resolved = true;
          imagesRef.current[index] = img;
          completed++;
          setLoadedCount(completed);
          if (onPreloadProgress) {
            onPreloadProgress(Math.min(100, Math.round((completed / totalFrames) * 100)));
          }
          if ('decode' in img) {
            img.decode().catch(() => {});
          }
          resolve();
        };

        const handleError = () => {
          if (resolved || !isMounted) return;
          if (attempt < 2) {
            // Retry twice after 200ms
            setTimeout(() => {
              loadSingleFrame(index, attempt + 1).then(resolve);
            }, 200);
          } else {
            resolved = true;
            completed++;
            setLoadedCount(completed);
            resolve();
          }
        };

        // Attach event listeners BEFORE setting img.src to prevent missing fast CDN/cache loads
        img.onload = handleSuccess;
        img.onerror = handleError;
        img.src = getFrameUrl(index);

        if (img.complete && img.naturalWidth > 0) {
          handleSuccess();
        }
      });
    };

    const preloadAll = async () => {
      // 1. Immediately load frame 0 so visual appears instantly
      await loadSingleFrame(0);

      // 2. Load keyframes (every 5th frame) to give instant scroll coverage
      const keyframeIndices: number[] = [];
      for (let i = 0; i < totalFrames; i += 5) {
        if (i !== 0) keyframeIndices.push(i);
      }

      // Concurrently load keyframes in batches of 8
      const batchSize = 8;
      for (let i = 0; i < keyframeIndices.length; i += batchSize) {
        if (!isMounted) return;
        const batch = keyframeIndices.slice(i, i + batchSize);
        await Promise.all(batch.map((idx) => loadSingleFrame(idx)));
      }

      // 3. Load all remaining frames
      const remainingIndices: number[] = [];
      for (let i = 0; i < totalFrames; i++) {
        if (!imagesRef.current[i]) remainingIndices.push(i);
      }

      for (let i = 0; i < remainingIndices.length; i += batchSize) {
        if (!isMounted) return;
        const batch = remainingIndices.slice(i, i + batchSize);
        await Promise.all(batch.map((idx) => loadSingleFrame(idx)));
      }
    };

    preloadAll();

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
        for (let offset = 1; offset < 60; offset++) {
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

        // Seamless patch layer: clone adjacent clean leather background over star region in bottom right
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;

        const srcX = nw * 0.800;
        const srcY = nh * 0.780;
        const srcW = nw * 0.075;
        const srcH = nh * 0.110;

        const dstX = dx + drawWidth * 0.865;
        const dstY = dy + drawHeight * 0.780;
        const dstW = drawWidth * 0.075;
        const dstH = drawHeight * 0.110;

        ctx.drawImage(img, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH);
      }

      ctx.restore();
    },
    [totalFrames]
  );

  // Redraw smoothly on animation frame updates or when new images finish loading
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
