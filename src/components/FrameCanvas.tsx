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

  // Preload frame images efficiently from /frames/ folder
  useEffect(() => {
    let isMounted = true;
    let count = 0;

    for (let i = 0; i < totalFrames; i++) {
      const frameNum = String(i + 1).padStart(3, '0');
      const url = `/frames/ezgif-frame-${frameNum}.jpg`;
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
        for (let offset = 1; offset < 30; offset++) {
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

        // Single ultra-fast 2D canvas draw call
        ctx.drawImage(img, dx, dy, drawWidth, drawHeight);

        // Tight square filter patch directly over the AI star watermark in bottom-right corner
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          const starX = dx + drawWidth * 0.905;
          const starY = dy + drawHeight * 0.825;
          const boxSize = Math.max(38, Math.min(drawWidth, drawHeight) * 0.055);
          const boxX = starX - boxSize / 2;
          const boxY = starY - boxSize / 2;

          // Sample clean studio floor background texture nearby (x=80%) where there is NO star watermark
          const sampleW = img.naturalWidth * 0.055;
          const sampleH = img.naturalHeight * 0.055;
          const sampleX = img.naturalWidth * 0.80 - sampleW / 2;
          const sampleY = img.naturalHeight * 0.825 - sampleH / 2;

          // Draw clean floor texture directly into tight square filter box
          ctx.drawImage(
            img,
            sampleX, sampleY, sampleW, sampleH,
            boxX, boxY, boxSize, boxSize
          );

          // Apply a subtle ambient tone blend so the patch dissolves seamlessly into the floor
          ctx.fillStyle = 'rgba(12, 12, 14, 0.15)';
          ctx.fillRect(boxX, boxY, boxSize, boxSize);
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