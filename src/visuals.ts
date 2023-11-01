import { drawCircle } from './canvas';
import { FADE_OUT_TIME } from './constants';
import { timeSince } from './utilities';

interface Vec2 {
  x: number
  y: number
}

interface DrawPoint extends Vec2 {
  time: number
}

interface Color {
  r: number
  g: number
  b: number
}

interface BrushStroke {
  color: Color
  points: DrawPoint[]
}

const defaultColors: Color[] = [
  { r: 255, g: 0, b: 0 },
  { r: 0, g: 255, b: 0 },
  { r: 0, g: 0, b: 255 },
  { r: 255, g: 0, b: 255 },
  { r: 0, g: 255, b: 255 },
  { r: 255, g: 255, b: 255 },
  { r: 255, g: 255, b: 0 },
  { r: 255, g: 150, b: 0 }
];

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

export function startNewBrushStroke() {
  brushStrokes.push({
    color: defaultColors[Math.floor(Math.random() * defaultColors.length)],
    points: []
  });
}

export function saveDrawPoint(x: number, y: number) {
  const { points } = brushStrokes[brushStrokes.length - 1];

  if (points) {
    points.push({
      x,
      y,
      time: Date.now()
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

export function render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  // Clear the screen
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const { points, color } of brushStrokes) {
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
        const startColor = `rgb(${color.r * startLightness}, ${color.g * startLightness}, ${color.b * startLightness})`;
        const endColor = `rgb(${color.r * endLightness}, ${color.g * endLightness}, ${color.b * endLightness})`;

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
        const colorValue = `rgb(${color.r * lightness}, ${color.g * lightness}, ${color.b * lightness})`;

        drawCircle(ctx, p.x, p.y, colorValue, radius);
      }
    }
  }

  clearUnusedDrawPointsAndBrushStrokes();
}