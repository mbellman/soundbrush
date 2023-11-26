import { drawCircle } from './canvas';
import { FADE_OUT_TIME, MIDDLE_NOTE } from './constants';
import { Settings, State, Vec2 } from './types';
import { lerp, timeSince } from './utilities';

interface Color {
  r: number
  g: number
  b: number
}

interface DrawPoint extends Vec2 {
  time: number
  color: Color
}

interface BrushStroke {
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

export function noteToColor(note: number): Color {
  const modNote = note % 12;
  const low = Math.floor(modNote);
  const high = Math.ceil(modNote);
  const lowColor = noteToColorMap[low] || noteToColorMap[11];
  const highColor = noteToColorMap[high] || noteToColorMap[0];
  const alpha = note % 1;

  return {
    r: lerp(lowColor.r, highColor.r, alpha),
    g: lerp(lowColor.g, highColor.g, alpha),
    b: lerp(lowColor.b, highColor.b, alpha)
  };
}

export function colorToRgbString({ r, g, b }: Color, factor = 1): string {
  return `rgb(${r * factor}, ${g * factor}, ${b * factor})`;
}

export function createNewBrushStroke(): BrushStroke {
  brushStrokes.push({
    points: []
  });

  return brushStrokes[brushStrokes.length - 1];
}

export function saveDrawPoint(x: number, y: number, color: Color) {
  const { points } = brushStrokes[brushStrokes.length - 1] || createNewBrushStroke();

  if (points) {
    points.push({
      x,
      y,
      time: Date.now(),
      color
    });
  }
}

export function clearUnusedDrawPointsAndBrushStrokes() {
  for (let i = 0; i < brushStrokes.length; i++) {
    const { points } = brushStrokes[i];

    if (timeSince(points[0]?.time) > FADE_OUT_TIME) {
      points.shift();
      points.shift();

      if (points.length === 0) {
        brushStrokes.splice(i, 1);
      }
    }
  }
}

export function clearScreen(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);  
}

export function drawNoteBars(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, state: State, settings: Settings) {
  const divisions = settings.divisions;
  const barHeight = window.innerHeight / divisions;
  const halfBarHeight = barHeight / 2;
  const topNote = MIDDLE_NOTE + Math.round(state.scroll.y / 50);
  const bottomNote = topNote - divisions;

  for (let i = topNote; i >= bottomNote; i--) {
    const topY = (topNote - i) * barHeight;
    const centerY = topY + halfBarHeight;
    const centerMouseDistance = Math.abs(state.mouse.y - centerY);

    if (state.drawing && centerMouseDistance < halfBarHeight) {
      // Playing note!
      lastNotePlayTimeMap[i] = Date.now();
    }

    if (settings.microtonal) {
      const barTopDistance = Math.abs(state.mouse.y - topY);
      const barBottomDistance = Math.abs(state.mouse.y - (topY + barHeight));
      const gradient = ctx.createLinearGradient(0, topY, 0, topY + barHeight);
      let startBrightness = 0.8 - Math.min(0.8, Math.sqrt(barTopDistance / 1000));
      let endBrightness = 0.8 - Math.min(0.8, Math.sqrt(barBottomDistance / 1000));

      gradient.addColorStop(0, colorToRgbString(noteToColor(i + 0.5), startBrightness));
      gradient.addColorStop(1, colorToRgbString(noteToColor(i - 0.5), endBrightness));

      ctx.fillStyle = gradient;
    } else {
      const strumHighlightBrightness = 0.5 * Math.max(0, 1 - timeSince(lastNotePlayTimeMap[i] || 0) / 500);
      let brightness = 0.8 - Math.min(0.8, Math.sqrt(centerMouseDistance / 1000));

      brightness += strumHighlightBrightness;

      ctx.fillStyle = colorToRgbString(noteToColor(i), brightness);
    }

    ctx.fillRect(0, topY, window.innerWidth, barHeight + 1);
  }

  // @todo strum highlight when playing microtonal notes

  const gradient = ctx.createLinearGradient(0, window.innerHeight / 2, window.innerWidth, window.innerHeight / 2);

  gradient.addColorStop(0, '#000');
  gradient.addColorStop(0.05, 'rgba(0, 0, 0, 0.5)');

  ctx.fillStyle = gradient;

  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

export function render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  for (const { points } of brushStrokes) {
    for (let i = 0; i < points.length; i += 2) {
      const pm2 = points[i - 2];
      const pm1 = points[i - 1];
      const p = points[i];
      const lifetime = timeSince(p.time) / FADE_OUT_TIME;
      const lightness = Math.min(1, 1 - lifetime);
      const radius = Math.max(0, 10 + 30 * lifetime);

      if (pm2 && pm1) {
        const startLifetime = timeSince(pm2.time) / FADE_OUT_TIME;
        const endLifetime = timeSince(p.time) / FADE_OUT_TIME;
        const startLightness = Math.min(1, 1 - startLifetime);
        const endLightness = Math.min(1, 1 - endLifetime);

        const { x: dx, y: dy } = normalize({
          x: p.x - pm1.x,
          y: p.y - pm1.y
        });

        const gradient = ctx.createLinearGradient(pm2.x - dx * radius, pm2.y - dy * radius, p.x + dx * radius, p.y + dy * radius);
        const startColor = `rgb(${pm2.color.r * startLightness}, ${pm2.color.g * startLightness}, ${pm2.color.b * startLightness})`;
        const endColor = `rgb(${p.color.r * endLightness}, ${p.color.g * endLightness}, ${p.color.b * endLightness})`;

        gradient.addColorStop(0, startColor);
        gradient.addColorStop(1, endColor);

        ctx.strokeStyle = gradient;

        const midpoint = {
          x: (pm2.x + p.x) / 2,
          y: (pm2.y + p.y) / 2,
        };

        const control = {
          x: pm1.x - midpoint.x,
          y: pm1.y - midpoint.y
        };

        control.x *= 2;
        control.y *= 2;

        control.x += midpoint.x;
        control.y += midpoint.y;

        ctx.lineWidth = radius * 2;

        ctx.beginPath();
        ctx.moveTo(pm2.x, pm2.y);
        ctx.quadraticCurveTo(control.x, control.y, p.x, p.y);
        ctx.stroke();

        drawCircle(ctx, p.x, p.y, gradient, radius);
      } else {
        const colorValue = `rgb(${p.color.r * lightness}, ${p.color.g * lightness}, ${p.color.b * lightness})`;

        drawCircle(ctx, p.x, p.y, colorValue, radius);
      }
    }
  }

  clearUnusedDrawPointsAndBrushStrokes();
}