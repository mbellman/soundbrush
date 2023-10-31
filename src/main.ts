import { createCanvas, drawCircle } from './canvas';
import './styles.scss';

interface DrawPoint {
  x: number
  y: number
  time: number
}

interface Color {
  r: number
  g: number
  b: number
}

interface PointGroup {
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

const pointGroups: PointGroup[] = [];

function timeSince(time: number) {
  return Date.now() - time;
}

function createNewPointGroup() {
  pointGroups.push({
    color: defaultColors[Math.floor(Math.random() * defaultColors.length)],
    points: []
  });
}

function saveDrawPoint(x: number, y: number) {
  const { points } = pointGroups[pointGroups.length - 1];

  if (points) {
    points.push({
      x,
      y,
      time: Date.now()
    });
  }
}

function clearUnusedPoints() {
  for (let i = 0; i < pointGroups.length; i++) {
    const { points } = pointGroups[i];

    if (timeSince(points[0]?.time) > 1000) {
      points.shift();
      points.shift();

      if (points.length === 0) {
        pointGroups.splice(i, 1);
      }
    }
  }
}

export default function main() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');

  let drawing = false;
  let rendering = true;

  document.addEventListener('mousedown', () => {
    drawing = true;

    createNewPointGroup();
  });

  document.addEventListener('mouseup', () => drawing = false);

  document.addEventListener('mousemove', e => {
    if (drawing) {
      saveDrawPoint(e.clientX, e.clientY);
    }
  });
  
  function render() {
    if (!rendering) {
      return;
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const { points, color } of pointGroups) {
      for (let i = 0; i < points.length; i += 2) {
        const pm2 = points[i - 2];
        const pm1 = points[i - 1];
        const p = points[i];
        const lifetime = timeSince(p.time) / 1000;
        const lightness = Math.min(1, 1 - lifetime);
        const radius = Math.max(0, 10 + 30 * lifetime);
        const colorValue = `rgb(${color.r * lightness}, ${color.g * lightness}, ${color.b * lightness})`;
  
        if (pm2 && pm1) {
          ctx.strokeStyle = colorValue;
  
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
  
          drawCircle(ctx, pm2.x, pm2.y, colorValue, radius);
          drawCircle(ctx, p.x, p.y, colorValue, radius);
        } else {
          drawCircle(ctx, p.x, p.y, colorValue, radius);
        }
      }
    }

    clearUnusedPoints();

    requestAnimationFrame(render);
  }

  render();

  document.body.appendChild(canvas);
}