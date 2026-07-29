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

  // Preload frame images efficiently with Frame 1 high-priority loading
  useEffect(() => {
    let isMounted = true;
    let count = 0;

    // 1. Prioritize frame 1 (index 0) immediately so canvas displays instantly on load (no initial black screen)
    const firstImg = new Image();
    try {
      (firstImg as unknown as { fetchPriority: string }).fetchPriority = 'high';
    } catch {}

    const onFirstLoad = () => {
      if (!isMounted) return;
      imagesRef.current[0] = firstImg;
      count++;
      if (onPreloadProgress) onPreloadProgress(Math.min(100, Math.round((count / totalFrames) * 100)));
    };
    firstImg.onload = onFirstLoad;
    firstImg.onerror = onFirstLoad;
    firstImg.src = '/frames/ezgif-frame-001.webp';

    if (firstImg.complete && firstImg.naturalWidth > 0) {
      onFirstLoad();
    }

    // 2. Preload remaining frame images
    for (let i = 1; i < totalFrames; i++) {
      const frameNum = String(i + 1).padStart(3, '0');
      const url = `/frames/ezgif-frame-${frameNum}.webp`;
      const img = new Image();

      const onLoad = () => {
        if (!isMounted) return;
        imagesRef.current[i] = img;
        count++;
        if (onPreloadProgress) {
          onPreloadProgress(Math.min(100, Math.round((count / totalFrames) * 100)));
        }
      };

      img.onload = onLoad;
      img.onerror = onLoad;
      img.src = url;

      if (img.complete && img.naturalWidth > 0) {
        onLoad();
      }
    }

    return () => {
      isMounted = false;
    };
  }, [totalFrames, onPreloadProgress]);

  // High-performance single-pass canvas render function
  const drawFrame = useCallback(
    (frameIdx: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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

      // Fetch loaded image or fallback to nearest available loaded frame
      let img = imagesRef.current[safeIndex];
      if (!img || !img.complete || img.naturalWidth === 0) {
        for (let offset = 1; offset < 40; offset++) {
          const prev = safeIndex - offset;
          if (prev >= 0 && imagesRef.current[prev]?.complete && imagesRef.current[prev]!.naturalWidth > 0) {
            img = imagesRef.current[prev];
            break;
          }
          const next = safeIndex + offset;
          if (next < totalFrames && imagesRef.current[next]?.complete && imagesRef.current[next]!.naturalWidth > 0) {
            img = imagesRef.current[next];
            break;
          }
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

        // Draw main frame image
        ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

        // Expanded square filter patch with radial edge-feathering to cover all star points invisibly
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

          // 1. Draw clean studio floor background texture into expanded filter box
          ctx.drawImage(
            img,
            sampleX, sampleY, sampleW, sampleH,
            boxX, boxY, boxSize, boxSize
          );

          // 2. Light ambient tone blend matching studio shadow
          ctx.fillStyle = 'rgba(12, 12, 14, 0.16)';
          ctx.fillRect(boxX, boxY, boxSize, boxSize);

          // 3. Delicate edge-feathering gradient so filter box dissolves seamlessly into studio floor
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

  // GSAP Ticker Render Loop (Only draws when frame index changes)
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

  // Handle window resize
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