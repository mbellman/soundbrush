import { createCanvas, drawCircle } from './canvas';
import './styles.scss';

interface DrawPoint {
  x: number
  y: number
  time: number
}

const recentPoints: DrawPoint[] = [];

export default function main() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');

  let drawing = false;
  let rendering = true;

  document.addEventListener('mousedown', () => drawing = true);
  document.addEventListener('mouseup', () => drawing = false);

  document.addEventListener('mousemove', e => {
    if (drawing) {
      recentPoints.push({
        x: e.clientX,
        y: e.clientY,
        time: Date.now()
      });
    }
  });

  function timeSince(time: number) {
    return Date.now() - time;
  }
  
  function render() {
    if (!rendering) {
      return;
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 40;

    for (let i = 0; i < recentPoints.length; i += 2) {
      const pm2 = recentPoints[i - 2];
      const pm1 = recentPoints[i - 1];
      const p = recentPoints[i];
      const lightness = Math.min(1, 1 - timeSince(p.time) / 1000);

      const color = `rgb(${255 * lightness}, 0, 0)`;

      if (pm2 && pm1) {
        ctx.strokeStyle = color;

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

        ctx.beginPath();
        ctx.moveTo(pm2.x, pm2.y);
        ctx.quadraticCurveTo(control.x, control.y, p.x, p.y);
        ctx.stroke();

        drawCircle(ctx, pm2.x, pm2.y, color);
        drawCircle(ctx, p.x, p.y, color);
      } else {
        drawCircle(ctx, p.x, p.y, color);
      }
    }

    if (timeSince(recentPoints[0]?.time) > 1000) {
      recentPoints.shift();
    }

    requestAnimationFrame(render);
  }

  render();

  document.body.appendChild(canvas);
}