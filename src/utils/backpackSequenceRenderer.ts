/**
 * 240-Frame Product Sequence Canvas Renderer for Sakido
 * Renders a high-definition 3D-styled minimalist Apple-grade product reveal.
 * Frame index ranges strictly from 0 to 239.
 */

export interface FrameRenderOptions {
  showLabels?: boolean;
  accentColor?: string;
  theme?: 'light' | 'dark';
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// Ease function for Apple-smooth mechanical feel
function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function renderBackpackFrame(
  ctx: CanvasRenderingContext2D,
  frameIndex: number,
  width: number,
  height: number,
  options: FrameRenderOptions = {}
) {
  // Normalize frame 0 to 239
  const frame = Math.max(0, Math.min(239, Math.round(frameIndex)));
  const progress = frame / 239;

  const showLabels = options.showLabels ?? true;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Center coordinates
  const centerX = width / 2;
  const centerY = height / 2 + 10;

  // Scale bag dynamically based on canvas dimensions
  const baseScale = Math.min(width, height) * 0.42;

  // Key animation phases computed over 240 frames
  const zipPhase = easeInOutCubic(clamp((progress - 0.08) / 0.22, 0, 1));
  const openPhase = easeInOutCubic(clamp((progress - 0.25) / 0.35, 0, 1));
  const sleevePhase = easeInOutCubic(clamp((progress - 0.52) / 0.28, 0, 1));
  const expandPhase = easeInOutCubic(clamp((progress - 0.75) / 0.25, 0, 1));

  // --- 1. Soft Floor Shadow ---
  ctx.save();
  const shadowY = centerY + baseScale * 0.72;
  const shadowWidth = baseScale * (0.85 + openPhase * 0.25);
  const shadowHeight = baseScale * (0.12 + openPhase * 0.06);
  const shadowGrad = ctx.createRadialGradient(
    centerX,
    shadowY,
    10,
    centerX,
    shadowY,
    shadowWidth
  );
  shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.12)');
  shadowGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.04)');
  shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(centerX, shadowY, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- 2. Rear Backpack Body (Shell) ---
  const bagW = baseScale * 0.82;
  const bagH = baseScale * 1.15;
  const bagX = centerX - bagW / 2;
  const bagY = centerY - bagH / 2;
  const bagRadius = 32;

  // Outer Back Shell
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;

  ctx.beginPath();
  ctx.roundRect(bagX, bagY, bagW, bagH, [bagRadius, bagRadius, 24, 24]);
  ctx.fillStyle = '#18181b'; // Matte zinc black
  ctx.fill();

  // Fine boundary stroke
  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // --- 3. Top Handle & Hardware ---
  ctx.save();
  const handleW = bagW * 0.35;
  const handleH = 22;
  const handleY = bagY - handleH + 8;
  ctx.beginPath();
  ctx.roundRect(centerX - handleW / 2, handleY, handleW, handleH, [10, 10, 0, 0]);
  ctx.fillStyle = '#09090b';
  ctx.fill();
  ctx.strokeStyle = '#3f3f46';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // --- 4. Internal Compartments & Gear (Revealed as bag opens) ---
  if (openPhase > 0.01) {
    ctx.save();

    // Clip to interior cavity
    const cavityMargin = 14;
    const cavityW = bagW - cavityMargin * 2;
    const cavityH = bagH - cavityMargin * 2;
    const cavityX = bagX + cavityMargin;
    const cavityY = bagY + cavityMargin;

    ctx.beginPath();
    ctx.roundRect(cavityX, cavityY, cavityW, cavityH, [20, 20, 16, 16]);
    ctx.fillStyle = '#121215'; // Darker felt lining
    ctx.fill();

    // --- Sleeve 1: Laptop Compartment (Rear) ---
    const laptopY = cavityY + 12 - sleevePhase * 15;
    const laptopH = cavityH * 0.62;
    const laptopW = cavityW - 20;

    ctx.beginPath();
    ctx.roundRect(centerX - laptopW / 2, laptopY, laptopW, laptopH, 12);
    ctx.fillStyle = '#27272a';
    ctx.fill();
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 1;
    ctx.stroke();

    // MacBook outline inside sleeve
    if (sleevePhase > 0.2) {
      const mbW = laptopW - 24;
      const mbH = laptopH - 20;
      const mbY = laptopY + 10 - sleevePhase * 25;
      ctx.beginPath();
      ctx.roundRect(centerX - mbW / 2, mbY, mbW, mbH, 8);
      ctx.fillStyle = '#e4e4e7'; // Aluminum metal finish
      ctx.fill();

      // Apple-style minimalist notch line
      ctx.fillStyle = '#71717a';
      ctx.beginPath();
      ctx.roundRect(centerX - 16, mbY + 6, 32, 4, 2);
      ctx.fill();

      // Module Tag: Notes
      if (showLabels && sleevePhase > 0.6) {
        drawModuleTag(ctx, centerX, mbY + 28, 'NOTES', 'Capture ideas without distraction', 1);
      }
    }

    // --- Sleeve 2: Tablet & Knowledge Vault ---
    if (sleevePhase > 0.3) {
      const tabW = cavityW - 40;
      const tabH = cavityH * 0.42;
      const tabY = cavityY + cavityH * 0.28 - sleevePhase * 10;

      ctx.beginPath();
      ctx.roundRect(centerX - tabW / 2, tabY, tabW, tabH, 10);
      ctx.fillStyle = '#18181b';
      ctx.fill();
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Tablet device
      const padW = tabW - 16;
      const padH = tabH - 12;
      const padY = tabY + 6 - sleevePhase * 18;
      ctx.beginPath();
      ctx.roundRect(centerX - padW / 2, padY, padW, padH, 6);
      ctx.fillStyle = '#09090b';
      ctx.fill();
      ctx.strokeStyle = '#3f3f46';
      ctx.stroke();

      // Screen preview line
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX - padW / 2 + 12, padY + 16);
      ctx.lineTo(centerX + padW / 2 - 12, padY + 16);
      ctx.stroke();

      // Module Tag: Knowledge
      if (showLabels && sleevePhase > 0.7) {
        drawModuleTag(ctx, centerX, padY + 32, 'KNOWLEDGE', 'Save everything worth remembering', 2);
      }
    }

    // --- Sleeve 3: Task & Calendar Organizer Sleeves ---
    if (sleevePhase > 0.5) {
      const orgW = (cavityW - 36) / 2;
      const orgH = cavityH * 0.32;
      const orgY = cavityY + cavityH * 0.58 - sleevePhase * 5;

      // Left Organizer: Tasks
      const leftX = cavityX + 12;
      ctx.beginPath();
      ctx.roundRect(leftX, orgY, orgW, orgH, 8);
      ctx.fillStyle = '#27272a';
      ctx.fill();
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Task checkboxes graphic
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(leftX + 16, orgY + 18, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(leftX + 16, orgY + 34, 4, 0, Math.PI * 2);
      ctx.fill();

      // Lines
      ctx.fillStyle = '#a1a1aa';
      ctx.fillRect(leftX + 26, orgY + 16, orgW - 36, 3);
      ctx.fillRect(leftX + 26, orgY + 32, orgW - 46, 3);

      if (showLabels && expandPhase > 0.2) {
        drawModuleTag(ctx, leftX + orgW / 2, orgY + 54, 'TASKS', 'Stay organized', 3);
      }

      // Right Organizer: Calendar
      const rightX = cavityX + cavityW - orgW - 12;
      ctx.beginPath();
      ctx.roundRect(rightX, orgY, orgW, orgH, 8);
      ctx.fillStyle = '#27272a';
      ctx.fill();
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Calendar grid lines graphic
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.strokeRect(rightX + 12, orgY + 12, 16, 16);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(rightX + 14, orgY + 14, 12, 4);

      if (showLabels && expandPhase > 0.2) {
        drawModuleTag(ctx, rightX + orgW / 2, orgY + 54, 'CALENDAR', 'Know what is next', 4);
      }
    }

    // --- Sleeve 4: AI Core Chip (Bottom Magnetic Dock) ---
    if (expandPhase > 0.2) {
      const chipW = cavityW - 60;
      const chipH = 28;
      const chipY = cavityY + cavityH - 38;

      ctx.beginPath();
      ctx.roundRect(centerX - chipW / 2, chipY, chipW, chipH, 6);
      ctx.fillStyle = '#09090b';
      ctx.fill();
      ctx.strokeStyle = '#6366f1'; // Indigo accent
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Chip status text
      ctx.fillStyle = '#818cf8';
      ctx.font = '600 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BRING YOUR OWN AI • LOCAL & PRIVATE', centerX, chipY + chipH / 2);
    }

    ctx.restore();
  }

  // --- 5. Front Flap (Unzips & Folds Downwards) ---
  ctx.save();
  const flapW = bagW - 4;
  const flapH = bagH * (1 - openPhase * 0.72);
  const flapX = centerX - flapW / 2;
  const flapY = bagY + openPhase * (bagH * 0.65);
  const flapRadius = Math.max(12, 28 - openPhase * 16);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 10;

  ctx.beginPath();
  ctx.roundRect(flapX, flapY, flapW, flapH, [openPhase > 0.2 ? 8 : 28, openPhase > 0.2 ? 8 : 28, 24, 24]);
  ctx.fillStyle = '#18181b';
  ctx.fill();

  ctx.strokeStyle = '#3f3f46';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Zipper Track Animation
  if (zipPhase > 0.01 && zipPhase < 0.99) {
    const zipY = bagY + zipPhase * (bagH * 0.6);
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, zipY, flapW / 2 - 2, Math.PI, 0);
    ctx.stroke();

    // Zipper Pull
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX + (flapW / 2 - 2) * Math.cos(zipPhase * Math.PI), zipY - 4, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Front Panel Sakido Minimal Branding (Visible when closed)
  if (openPhase < 0.6) {
    const brandOpacity = clamp(1 - openPhase * 1.8, 0, 1);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * brandOpacity})`;
    ctx.font = '700 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '3px';
    ctx.fillText('S A K I D O', centerX, flapY + flapH * 0.45);

    ctx.fillStyle = `rgba(161, 161, 170, ${0.7 * brandOpacity})`;
    ctx.font = '400 9px sans-serif';
    ctx.fillText('STUDENT WORKSPACE', centerX, flapY + flapH * 0.45 + 18);
  }

  ctx.restore();

  // --- 6. Frame Index Overlay Badge ---
  ctx.save();
  ctx.fillStyle = 'rgba(9, 9, 11, 0.05)';
  ctx.beginPath();
  ctx.roundRect(width - 120, 16, 104, 24, 12);
  ctx.fill();

  ctx.fillStyle = '#52525b';
  ctx.font = '600 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const padFrame = String(frame + 1).padStart(3, '0');
  ctx.fillText(`FRAME ${padFrame} / 240`, width - 68, 28);
  ctx.restore();
}

/** Helper to draw clean Apple-style pill tags for internal sections */
function drawModuleTag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  title: string,
  _subtitle: string,
  _index: number
) {
  ctx.save();
  ctx.font = '700 9px sans-serif';
  const textWidth = ctx.measureText(title).width;
  const paddingX = 8;
  const pillW = textWidth + paddingX * 2;
  const pillH = 16;

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.roundRect(x - pillW / 2, y - pillH / 2, pillW, pillH, 8);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x, y);
  ctx.restore();
}
