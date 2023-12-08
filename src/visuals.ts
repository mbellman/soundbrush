import { drawCircle } from './canvas';
import { DEFAULT_BEAT_LENGTH, DEFAULT_NOTE_LENGTH, FADE_OUT_TIME, MIDDLE_NOTE } from './constants';
import { Settings, State, Vec2 } from './types';
import { clamp, lerp, mod, timeSince } from './utilities';

interface Color {
  r: number
  g: number
  b: number
}

interface DrawPoint extends Vec2 {
  time: number
  color: Color
}

export interface BrushStroke {
  radius: number
  points: DrawPoint[]
}

const noteToColorMap: Record<number, Color> = {
  0: { r: 255, g: 0, b: 0 },
  1: { r: 255, g: 100, b: 0 },
  2: { r: 255, g: 200, b: 0 },
  3: { r: 0, g: 255, b: 100 },
  4: { r: 0, g: 255, b: 200 },
  5: { r: 0, g: 200, b: 255 },
  6: { r: 0, g: 100, b: 255 },
  7: { r: 0, g: 0, b: 255 },
  8: { r: 100, g: 0, b: 255 },
  9: { r: 200, g: 0, b: 255 },
  10: { r: 255, g: 0, b: 255 },
  11: { r: 255, g: 0, b: 150 }
};

const brushStrokes: BrushStroke[] = [];

const lastNotePlayTimeMap: Record<number, number> = {};

/**
 * @internal
 */
function normalize({ x, y }: Vec2): Vec2 {
  const magnitude = Math.max(1, Math.sqrt(x*x + y*y));

  return {
    x: x / magnitude,
    y: y / magnitude
  };
}

export function lerpColor(a: Color, b: Color, alpha: number): Color {
  return {
    r: lerp(a.r, b.r, alpha),
    g: lerp(a.g, b.g, alpha),
    b: lerp(a.b, b.b, alpha)
  };
}

export function noteToColor(note: number): Color {
  const modNote = note % 12;
  const low = Math.floor(modNote);
  const high = Math.ceil(modNote);
  const lowColor = noteToColorMap[low] || noteToColorMap[11];
  const highColor = noteToColorMap[high] || noteToColorMap[0];
  const alpha = note % 1;

  return lerpColor(lowColor, highColor, alpha);
}

export function colorToRgbString({ r, g, b }: Color, factor = 1): string {
  return `rgb(${r * factor}, ${g * factor}, ${b * factor})`;
}

export function createNewBrushStroke({ radius = 20 } = {}): BrushStroke {
  brushStrokes.push({
    radius,
    points: []
  });

  return brushStrokes[brushStrokes.length - 1];
}

export function saveDrawPointToBrushStroke(brushStroke: BrushStroke, x: number, y: number, color: Color): void {
  const { points } = brushStroke;

  if (points) {
    points.push({
      x,
      y,
      time: Date.now(),
      color
    });
  }
}

export function saveDrawPoint(x: number, y: number, color: Color) {
  const brushStroke = brushStrokes[brushStrokes.length - 1] || createNewBrushStroke();

  saveDrawPointToBrushStroke(brushStroke, x, y, color);
}

export function clearUnusedDrawPointsAndBrushStrokes() {
  let i = 0;

  while (i < brushStrokes.length) {
    const { points } = brushStrokes[i];

    if (timeSince(points[0]?.time) > FADE_OUT_TIME) {
      points.shift();
      points.shift();

      if (points.length === 0) {
        brushStrokes.splice(i, 1);

        continue;
      }
    }

    i++;
  }
}

export function clearScreen(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function drawNoteBars(ctx: CanvasRenderingContext2D, state: State, settings: Settings) {
  const dpr = window.devicePixelRatio;

  const divisions = settings.divisions;
  const barHeight = window.innerHeight / divisions;
  const halfBarHeight = barHeight / 2;
  const topNote = MIDDLE_NOTE + Math.floor(state.scroll.y / barHeight);
  const remainder = mod(state.scroll.y, barHeight);
  const bottomNote = topNote - divisions;

  for (let i = topNote + 1; i >= bottomNote; i--) {
    const topY = (topNote - i) * barHeight + remainder;
    const centerY = topY + halfBarHeight;
    const centerMouseDistance = Math.abs(state.mouse.y - centerY);
    const waveBrightness = 0.05 + Math.sin(Date.now() / 400 + i * 0.5) * 0.05;

    if (state.mousedown && centerMouseDistance < halfBarHeight) {
      // Playing note!
      lastNotePlayTimeMap[i] = Date.now();
    }

    if (settings.microtonal) {
      const barTopDistance = Math.abs(state.mouse.y - topY);
      const barBottomDistance = Math.abs(state.mouse.y - (topY + barHeight));
      const gradient = ctx.createLinearGradient(0, topY, 0, topY + barHeight);
      let startBrightness = 0.8 - Math.min(0.8, Math.sqrt(barTopDistance / 1000));
      let endBrightness = 0.8 - Math.min(0.8, Math.sqrt(barBottomDistance / 1000));

      gradient.addColorStop(0, colorToRgbString(noteToColor(i + 0.5), startBrightness + waveBrightness));
      gradient.addColorStop(1, colorToRgbString(noteToColor(i - 0.5), endBrightness + waveBrightness));

      ctx.fillStyle = gradient;
    } else {
      const strumHighlightBrightness = 0.5 * Math.max(0, 1 - timeSince(lastNotePlayTimeMap[i] || 0) / 500);
      let brightness = 0.8 - Math.min(0.8, Math.sqrt(centerMouseDistance / 1000));

      brightness += strumHighlightBrightness + waveBrightness;

      ctx.fillStyle = colorToRgbString(noteToColor(i), brightness);
    }

    ctx.fillRect(0, topY * dpr, window.innerWidth * dpr, dpr * (barHeight + 1));
  }

  // @todo strum highlight when playing microtonal notes

  const gradient = ctx.createLinearGradient(0, dpr * window.innerHeight / 2, dpr * window.innerWidth, dpr * window.innerHeight / 2);

  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  gradient.addColorStop(0.1, 'rgba(0, 0, 0, 0.5)');
  gradient.addColorStop(0.9, 'rgba(0, 0, 0, 0.5)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');

  ctx.fillStyle = gradient;

  ctx.fillRect(0, 0, window.innerWidth * dpr, window.innerHeight * dpr);
}

let beatLinesFocusX = 0;

export function drawBeatLines(ctx: CanvasRenderingContext2D, state: State, settings: Settings) {
  const dpr = window.devicePixelRatio;

  const mouseYRatio = clamp(state.mouse.y / window.innerHeight, 0, 1);
  const totalBeats = window.innerWidth / DEFAULT_BEAT_LENGTH;
  const targetFocusX = state.sequence.isPlaying() ? mod(state.sequence.getPlayOffsetTime() * 400 - state.scroll.x, window.innerWidth) : state.mouse.x;

  beatLinesFocusX = lerp(beatLinesFocusX, targetFocusX, state.sequence.isPlaying() ? 1 : 0.02);

  for (let i = 0; i < totalBeats; i++) {
    const x = i * DEFAULT_BEAT_LENGTH;
    const isMeasureMarker = i % 4 === 0;
    const alpha = Math.pow(0.95 - Math.abs(x - beatLinesFocusX) / window.innerWidth, 6);
    const gradient = ctx.createLinearGradient(x * dpr, 0, x * dpr, window.innerHeight * dpr);
    const { r, g, b }: Color = isMeasureMarker ? { r: 255, g: 200, b: 0 } : { r: 100, g: 100, b: 100 };

    gradient.addColorStop(Math.max(0, mouseYRatio - 0.5), `rgba(${r}, ${g}, ${b}, 0)`);
    gradient.addColorStop(mouseYRatio, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    gradient.addColorStop(Math.min(1, mouseYRatio + 0.5), `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.lineWidth = isMeasureMarker ? 2 : 1;
    ctx.strokeStyle = gradient;

    ctx.beginPath();
    ctx.moveTo(x * dpr, 0);
    ctx.lineTo(x * dpr, window.innerHeight * dpr);
    ctx.stroke();
  }
}

let lastNotePreviewX = 0;
let lastNotePreviewY = 0;

export function drawNotePreview(ctx: CanvasRenderingContext2D, state: State, settings: Settings) {
  if (state.mousedown) {
    return;
  }

  const dpr = window.devicePixelRatio;

  const { mouse, scroll } = state;
  const barHeight = window.innerHeight / settings.divisions;
  const scrollRemainder = mod(state.scroll.y, barHeight);
  const noteElementHeight = barHeight - 10;
  const opacity = 0.2 + 0.1 * Math.sin(Date.now() / 200);

  const targetX = settings.useSnapping
    ? Math.floor((scroll.x + mouse.x) / DEFAULT_BEAT_LENGTH) * DEFAULT_BEAT_LENGTH - scroll.x
    : mouse.x;

  const targetY = settings.microtonal
    ? mouse.y - noteElementHeight / 2
    : Math.floor((mouse.y - scrollRemainder) / barHeight) * barHeight + scrollRemainder + 5;

  const noteLength = settings.useSnapping ? DEFAULT_BEAT_LENGTH : DEFAULT_NOTE_LENGTH;
  const x = lerp(lastNotePreviewX, targetX, 0.25);
  const y = lerp(lastNotePreviewY, targetY, 0.25);

  lastNotePreviewX = x;
  lastNotePreviewY = y;

  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.fillRect(x * dpr, y * dpr, noteLength * dpr, noteElementHeight * dpr);
}

export function drawBrushStrokes(ctx: CanvasRenderingContext2D, state: State) {
  const dpr = window.devicePixelRatio;
  const { scroll } = state;

  for (const { points, radius: baseRadius } of brushStrokes) {
    for (let i = 0; i < points.length; i += 2) {
      const pm2 = points[i - 2];
      const pm1 = points[i - 1];
      const p = points[i];
      const lifetime = timeSince(p.time) / FADE_OUT_TIME;
      const radius = Math.max(0, baseRadius * (1 - lifetime));

      if (pm2 && pm1) {
        const { x: dx, y: dy } = normalize({
          x: p.x - pm1.x,
          y: p.y - pm1.y
        });

        const gradient = ctx.createLinearGradient(
          dpr * (pm2.x - dx * radius + scroll.x),
          dpr * (pm2.y - dy * radius + scroll.y),
          dpr * (p.x + dx * radius + scroll.x),
          dpr * (p.y + dy * radius + scroll.y)
        );

        const startColor = `rgb(${pm2.color.r}, ${pm2.color.g}, ${pm2.color.b})`;
        const endColor = `rgb(${p.color.r}, ${p.color.g}, ${p.color.b})`;

        gradient.addColorStop(0, startColor);
        gradient.addColorStop(1, endColor);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = radius * 2 * dpr;

        ctx.beginPath();
        ctx.moveTo(pm2.x * dpr + scroll.x * dpr, pm2.y * dpr + scroll.y * dpr);
        ctx.quadraticCurveTo(pm1.x * dpr + scroll.x * dpr, pm1.y * dpr + scroll.y * dpr, p.x * dpr + scroll.x * dpr, p.y * dpr + scroll.y * dpr);
        ctx.stroke();

        drawCircle(ctx, p.x * dpr + scroll.x * dpr, p.y * dpr + scroll.y * dpr, gradient, radius * dpr);
      } else {
        const colorValue = `rgb(${p.color.r}, ${p.color.g}, ${p.color.b})`;

        drawCircle(ctx, p.x * dpr + scroll.x * dpr, p.y * dpr + scroll.y * dpr, colorValue, radius * dpr);
      }
    }
  }

  clearUnusedDrawPointsAndBrushStrokes();
}

interface Sparkle {
  spawnTime: number
  position: Vec2
  radius: number
}

const sparkles: Sparkle[] = [];

export function spawnSparkles(state: State): void {
  sparkles.push({
    spawnTime: Date.now(),
    position: {
      x: state.mouse.x + Math.sin(Date.now()) * 3 - state.scroll.x,
      y: state.mouse.y + Math.cos(Date.now()) * 3 - state.scroll.y,
    },
    radius: Math.random() * 1.5
  });
}

export function drawSparkles(ctx: CanvasRenderingContext2D, state: State): void {
  const dpr = window.devicePixelRatio;
  const { scroll } = state;

  let i = 0;

  // Remove dead particles
  while (i < sparkles.length) {
    if (timeSince(sparkles[i].spawnTime) >= 2000) {
      sparkles.splice(i, 1);
    } else {
      i++;
    }
  }

  // Draw particles
  for (const { spawnTime, position, radius } of sparkles) {
    const lifetime = timeSince(spawnTime) / 2000;
    const alpha = 1 - lifetime * lifetime;
    const x = position.x + Math.sin(spawnTime + Date.now() / 500) * 50 * lifetime + scroll.x;
    const y = position.y + Math.sin(spawnTime + Date.now() / 900) * 50 * lifetime + scroll.y;
    const { r, g, b } = noteToColor(spawnTime / 100);

    drawCircle(ctx, x * dpr, y * dpr, `rgba(${r}, ${g}, ${b}, ${alpha})`, radius * (1 - lifetime) * dpr);
  }
}