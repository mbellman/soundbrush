import { drawCircle } from './canvas';
import { FADE_OUT_TIME } from './constants';
import { Vec2 } from './types';
import { timeSince } from './utilities';

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
  return noteToColorMap[note % 12];
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

const lastNotePlayTimeMap: Record<number, number> = {};

export function drawNoteBars(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, mouseY: number, drawing: boolean) {
  const divisions = 20;
  const barHeight = window.innerHeight / divisions;
  const halfBarHeight = barHeight / 2;

  for (let i = 50; i >= 30; i--) {
    const yOffset = (50 - i) * barHeight;
    const centerY = yOffset + halfBarHeight;
    const distance = Math.abs(mouseY - centerY);
    let brightness = 0.8 - Math.sqrt(distance / 5000);

    brightness += 0.5 * Math.max(0, 1 - timeSince(lastNotePlayTimeMap[i] || 0) / 500);

    if (drawing && distance < halfBarHeight) {
      // Playing note!
      lastNotePlayTimeMap[i] = Date.now();
    }

    ctx.fillStyle = colorToRgbString(noteToColor(i), brightness);

    ctx.fillRect(0, yOffset, window.innerWidth, barHeight + 1);
  }

  const gradient = ctx.createLinearGradient(0, window.innerHeight / 2, window.innerWidth, window.innerHeight / 2);

  gradient.addColorStop(0, '#000');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, '#000');

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