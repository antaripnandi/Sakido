import React, { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';

interface FrameCanvasProps {
  frameRef: React.MutableRefObject<number>;
  totalFrames?: number;
  className?: string;
  onPreloadProgress?: (progress: number) => void;
}

export const FrameCanvas: React.FC<FrameCanvasProps> = ({
  frameRef,
  totalFrames = 240,
  className = '',
  onPreloadProgress,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>(new Array(totalFrames).fill(null));
  const isLoadedMapRef = useRef<boolean[]>(new Array(totalFrames).fill(false));

  // High-performance progressive frame preloader optimized for mobile & desktop
  useEffect(() => {
    let isMounted = true;
    let loadedCount = 0;

    // 1. High-priority Frame 1 loading (displays hero frame instantly without black flash)
    const firstImg = new Image();
    try {
      (firstImg as unknown as { fetchPriority: string }).fetchPriority = 'high';
    } catch {}

    const onFirstLoad = () => {
      if (!isMounted) return;
      imagesRef.current[0] = firstImg;
      isLoadedMapRef.current[0] = true;
      loadedCount++;
      // Immediately draw Frame 1 to canvas on load (eliminates 0ms black screen)
      requestAnimationFrame(() => drawFrame(0));
      if (onPreloadProgress) {
        onPreloadProgress(Math.min(100, Math.round((loadedCount / totalFrames) * 100)));
      }
    };

    firstImg.onload = onFirstLoad;
    firstImg.onerror = onFirstLoad;
    firstImg.src = '/frames/ezgif-frame-001.webp';

    if (firstImg.complete && firstImg.naturalWidth > 0) {
      onFirstLoad();
    }

    // 2. Mobile-friendly batched preloader (loads frames in smooth chunks to prevent thread lag)
    const loadFrame = (index: number) => {
      if (!isMounted || isLoadedMapRef.current[index]) return;

      const frameNum = String(index + 1).padStart(3, '0');
      const url = `/frames/ezgif-frame-${frameNum}.webp`;
      const img = new Image();

      const onLoad = () => {
        if (!isMounted) return;
        imagesRef.current[index] = img;
        isLoadedMapRef.current[index] = true;
        loadedCount++;
        if (onPreloadProgress) {
          onPreloadProgress(Math.min(100, Math.round((loadedCount / totalFrames) * 100)));
        }
      };

      img.onload = onLoad;
      img.onerror = onLoad;
      img.src = url;

      if (img.complete && img.naturalWidth > 0) {
        onLoad();
      }
    };

    // Stagger remaining frame loads in chunks of 12 to keep mobile CPU & network sockets fast
    let currentIdx = 1;
    const batchSize = 12;

    const processNextBatch = () => {
      if (!isMounted || currentIdx >= totalFrames) return;
      const end = Math.min(totalFrames, currentIdx + batchSize);
      for (let i = currentIdx; i < end; i++) {
        loadFrame(i);
      }
      currentIdx = end;

      if (currentIdx < totalFrames) {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(processNextBatch);
        } else {
          setTimeout(processNextBatch, 16);
        }
      }
    };

    processNextBatch();

    return () => {
      isMounted = false;
    };
  }, [totalFrames, onPreloadProgress]);

  // High-performance Canvas Renderer
  const drawFrame = useCallback(
    (frameIdx: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;

      // Clamp DPR to 1.5 max (or 1.25 on mobile) to protect mobile RAM and battery
      const isMobile = window.innerWidth <= 768;
      const maxDpr = isMobile ? 1.25 : 1.5;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

      const targetW = Math.floor(width * dpr);
      const targetH = Math.floor(height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const maxIndex = totalFrames - 1;
      const safeIndex = Math.max(0, Math.min(maxIndex, Math.round(frameIdx)));

      // Fetch target frame or fallback to nearest loaded frame if scrolling faster than network
      let img = imagesRef.current[safeIndex];
      if (!img || !img.complete || img.naturalWidth === 0) {
        for (let offset = 1; offset < 50; offset++) {
          const prev = safeIndex - offset;
          if (prev >= 0 && isLoadedMapRef.current[prev] && imagesRef.current[prev]?.naturalWidth! > 0) {
            img = imagesRef.current[prev];
            break;
          }
          const next = safeIndex + offset;
          if (next < totalFrames && isLoadedMapRef.current[next] && imagesRef.current[next]?.naturalWidth! > 0) {
            img = imagesRef.current[next];
            break;
          }
        }
      }

      // Fallback to initial hero frame (Frame 1) if no nearby frame is ready
      if (!img || !img.complete || img.naturalWidth === 0) {
        if (imagesRef.current[0]?.complete && imagesRef.current[0]!.naturalWidth > 0) {
          img = imagesRef.current[0];
        }
      }

      if (img && img.complete && img.naturalWidth > 0) {
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

        // Expanded square filter patch with radial edge-feathering to cover watermark
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          const starX = dx + drawWidth * 0.905;
          const starY = dy + drawHeight * 0.825;
          const boxSize = Math.max(54, Math.min(drawWidth, drawHeight) * 0.088);
          const boxX = starX - boxSize / 2;
          const boxY = starY - boxSize / 2;

          const sampleW = img.naturalWidth * 0.088;
          const sampleH = img.naturalHeight * 0.088;
          const sampleX = img.naturalWidth * 0.80 - sampleW / 2;
          const sampleY = img.naturalHeight * 0.825 - sampleH / 2;

          ctx.save();

          // 1. Draw clean studio floor background texture into filter box
          ctx.drawImage(
            img,
            sampleX, sampleY, sampleW, sampleH,
            boxX, boxY, boxSize, boxSize
          );

          // 2. Ambient tone blend matching studio shadow
          ctx.fillStyle = 'rgba(12, 12, 14, 0.16)';
          ctx.fillRect(boxX, boxY, boxSize, boxSize);

          // 3. Delicate edge-feathering radial gradient
          const edgeGrad = ctx.createRadialGradient(
            starX, starY, boxSize * 0.32,
            starX, starY, boxSize * 0.65
          );
          edgeGrad.addColorStop(0, 'rgba(12, 12, 14, 0)');
          edgeGrad.addColorStop(1, 'rgba(12, 12, 14, 0.32)');

          ctx.fillStyle = edgeGrad;
          ctx.fillRect(boxX, boxY, boxSize, boxSize);

          ctx.restore();
        }
      } else {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.restore();
    },
    [totalFrames]
  );

  // GSAP Ticker Render Loop (Synchronized with display refresh rate)
  useEffect(() => {
    let lastDrawnIndex = -1;
    const update = () => {
      const currentIdx = Math.round(frameRef.current);
      if (currentIdx !== lastDrawnIndex) {
        lastDrawnIndex = currentIdx;
        drawFrame(frameRef.current);
      }
    };
    gsap.ticker.add(update);
    drawFrame(frameRef.current);

    return () => {
      gsap.ticker.remove(update);
    };
  }, [drawFrame, frameRef]);

  // Handle Window Resize
  useEffect(() => {
    const handleResize = () => {
      drawFrame(frameRef.current);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawFrame, frameRef]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};