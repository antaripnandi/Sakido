import React, { useEffect, useRef, useCallback } from 'react';

interface FrameCanvasProps {
  currentFrame: number; // 0 to totalFrames - 1
  totalFrames?: number;
  className?: string;
  onPreloadProgress?: (progress: number) => void;
}

// Global cache and in-flight deduplication to prevent duplicate requests or cancelled image loads
const globalImageCache = new Map<number, HTMLImageElement>();
const inFlightPromises = new Map<number, Promise<HTMLImageElement | null>>();

export const FrameCanvas: React.FC<FrameCanvasProps> = ({
  currentFrame,
  totalFrames = 240,
  className = '',
  onPreloadProgress,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>(new Array(totalFrames).fill(null));
  const onPreloadProgressRef = useRef(onPreloadProgress);

  useEffect(() => {
    onPreloadProgressRef.current = onPreloadProgress;
  }, [onPreloadProgress]);

  // Preload frame images smoothly in priority order with strict deduplication
  useEffect(() => {
    let isMounted = true;

    const getFrameUrl = (index: number) => {
      const numStr = String(index + 1).padStart(3, '0');
      const baseUrl = (import.meta as any).env?.BASE_URL || '/';
      const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      return `${prefix}frames/ezgif-frame-${numStr}.jpg`;
    };

    const loadSingleFrame = (index: number): Promise<HTMLImageElement | null> => {
      if (globalImageCache.has(index)) {
        return Promise.resolve(globalImageCache.get(index)!);
      }

      if (inFlightPromises.has(index)) {
        return inFlightPromises.get(index)!;
      }

      const promise = new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();

        const cleanupAndResolve = (resultImg: HTMLImageElement | null) => {
          inFlightPromises.delete(index);
          resolve(resultImg);
        };

        img.onload = () => {
          if (img.naturalWidth > 0) {
            globalImageCache.set(index, img);
            cleanupAndResolve(img);
          } else {
            cleanupAndResolve(null);
          }
        };

        img.onerror = () => {
          cleanupAndResolve(null);
        };

        img.src = getFrameUrl(index);

        if (img.complete && img.naturalWidth > 0) {
          globalImageCache.set(index, img);
          cleanupAndResolve(img);
        }
      });

      inFlightPromises.set(index, promise);
      return promise;
    };

    const preloadAll = async () => {
      const updateProgress = () => {
        if (onPreloadProgressRef.current && isMounted) {
          onPreloadProgressRef.current(
            Math.min(100, Math.round((globalImageCache.size / totalFrames) * 100))
          );
        }
      };

      // 1. Immediately load frame 0
      const firstImg = await loadSingleFrame(0);
      if (isMounted) {
        imagesRef.current[0] = firstImg;
        updateProgress();
      }

      // 2. Load keyframes (every 5th frame) to give instant scroll coverage
      const keyframeIndices: number[] = [];
      for (let i = 0; i < totalFrames; i += 5) {
        if (i !== 0) keyframeIndices.push(i);
      }

      const batchSize = 6;
      for (let i = 0; i < keyframeIndices.length; i += batchSize) {
        if (!isMounted) return;
        const batch = keyframeIndices.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (idx) => {
            const img = await loadSingleFrame(idx);
            if (isMounted) {
              imagesRef.current[idx] = img;
              updateProgress();
            }
          })
        );
      }

      // 3. Load all remaining frames
      const remainingIndices: number[] = [];
      for (let i = 0; i < totalFrames; i++) {
        if (!globalImageCache.has(i) && !inFlightPromises.has(i)) {
          remainingIndices.push(i);
        }
      }

      for (let i = 0; i < remainingIndices.length; i += batchSize) {
        if (!isMounted) return;
        const batch = remainingIndices.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (idx) => {
            const img = await loadSingleFrame(idx);
            if (isMounted) {
              imagesRef.current[idx] = img;
              updateProgress();
            }
          })
        );
      }
    };

    preloadAll();

    return () => {
      isMounted = false;
    };
  }, [totalFrames]);

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
      let img = imagesRef.current[safeIndex] || globalImageCache.get(safeIndex) || null;
      if (!img || !img.complete || img.naturalWidth === 0) {
        for (let offset = 1; offset < 60; offset++) {
          const prevIdx = safeIndex - offset;
          const prevImg = (prevIdx >= 0 && (imagesRef.current[prevIdx] || globalImageCache.get(prevIdx))) || null;
          if (prevImg?.complete && prevImg.naturalWidth > 0) {
            img = prevImg;
            break;
          }
          const nextIdx = safeIndex + offset;
          const nextImg = (nextIdx < totalFrames && (imagesRef.current[nextIdx] || globalImageCache.get(nextIdx))) || null;
          if (nextImg?.complete && nextImg.naturalWidth > 0) {
            img = nextImg;
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

  // Redraw smoothly on animation frame updates
  useEffect(() => {
    let animId = requestAnimationFrame(() => {
      drawFrame(currentFrame);
    });
    return () => cancelAnimationFrame(animId);
  }, [currentFrame, drawFrame]);

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
