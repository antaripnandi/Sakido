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

  // Preload frame images from /frames/ folder
  useEffect(() => {
    let isMounted = true;
    let count = 0;

    const loadFrame = (index: number) => {
      const i = index + 1;
      const numStr = String(i).padStart(3, '0');
      const url = `/frames/ezgif-frame-${numStr}.jpg`;
      const img = new Image();

      const handleLoad = () => {
        if (!isMounted) return;
        imagesRef.current[index] = img;
        count++;
        if (onPreloadProgress) onPreloadProgress(Math.min(100, Math.round((count / totalFrames) * 100)));

        if ('decode' in img) {
          img.decode().catch(() => {});
        }
      };

      const handleError = () => {
        if (!isMounted) return;
        count++;
        if (onPreloadProgress) onPreloadProgress(Math.min(100, Math.round((count / totalFrames) * 100)));
      };

      img.onload = handleLoad;
      img.onerror = handleError;
      img.src = url;

      if (img.complete && img.naturalWidth > 0) {
        handleLoad();
      }
    };

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

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
      ctx.imageSmoothingQuality = 'medium';

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

        // Square filter directly over the AI star watermark in bottom-right corner
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          const starX = dx + drawWidth * 0.905;
          const starY = dy + drawHeight * 0.825;
          const boxSize = Math.max(52, Math.min(drawWidth, drawHeight) * 0.085);
          const boxX = starX - boxSize / 2;
          const boxY = starY - boxSize / 2;

          ctx.save();

          // 1. Sample clean studio floor texture nearby (at x=80%) where there is NO star watermark
          const sampleW = img.naturalWidth * 0.085;
          const sampleH = img.naturalHeight * 0.085;
          const sampleX = img.naturalWidth * 0.80 - sampleW / 2;
          const sampleY = img.naturalHeight * 0.825 - sampleH / 2;

          // Draw clean floor texture directly into square filter box (bilinear sampling provides smooth texture)
          ctx.drawImage(
            img,
            sampleX, sampleY, sampleW, sampleH,
            boxX, boxY, boxSize, boxSize
          );

          // 2. Apply a light tone blend matching ambient studio shade
          ctx.fillStyle = 'rgba(12, 12, 14, 0.18)';
          ctx.fillRect(boxX, boxY, boxSize, boxSize);

          // 3. Add delicate edge-feathering gradient so filter box dissolves into floor
          const edgeGrad = ctx.createRadialGradient(
            starX, starY, boxSize * 0.35,
            starX, starY, boxSize * 0.65
          );
          edgeGrad.addColorStop(0, 'rgba(12, 12, 14, 0)');
          edgeGrad.addColorStop(1, 'rgba(12, 12, 14, 0.25)');

          ctx.fillStyle = edgeGrad;
          ctx.fillRect(boxX, boxY, boxSize, boxSize);

          ctx.restore();
        }
      }

      ctx.restore();
    },
    [totalFrames]
  );

  // GSAP Ticker Render Loop (Decoupled from React State)
  useEffect(() => {
    const update = () => drawFrame(frameRef.current);
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