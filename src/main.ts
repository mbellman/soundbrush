import { createCanvas } from './canvas';
import { render, saveDrawPoint, startNewBrushStroke } from './visuals';
import './styles.scss';

export default function main() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');

  let drawing = false;
  let running = true;

  document.addEventListener('mousedown', () => {
    drawing = true;

    startNewBrushStroke();
  });

  document.addEventListener('mouseup', () => drawing = false);

  document.addEventListener('mousemove', e => {
    if (drawing) {
      saveDrawPoint(e.clientX, e.clientY);
    }
  });
  
  function loop() {
    if (!running) {
      return;
    }

    render(canvas, ctx);

    requestAnimationFrame(loop);
  }

  loop();

  document.body.appendChild(canvas);
}