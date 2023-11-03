import { createCanvas } from './canvas';
import { render, saveDrawPoint, startNewBrushStroke } from './visuals';
import { handleSounds, modulateCurrentSound, startNewSound, stopCurrentSound, stopModulatingCurrentSound } from './audio';
import { Vec2 } from './types';
import './styles.scss';

export default function main() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');

  let drawing = false;
  let running = true;
  let lastMouse: Vec2;

  document.addEventListener('mousedown', e => {
    drawing = true;
 
    lastMouse = {
      x: e.clientX,
      y: e.clientY
    };

    const note = 30 + Math.round(Math.random() * 20);

    startNewBrushStroke();
    startNewSound('electricPiano', note);
  });

  document.addEventListener('mousemove', e => {
    if (drawing) {
      saveDrawPoint(e.clientX, e.clientY);

      const delta: Vec2 = {
        x: e.clientX - lastMouse.x,
        y: e.clientY - lastMouse.y
      };

      // @todo use mouse speed to control sound behavior
      const mouseSpeed = Math.sqrt(delta.x*delta.x + delta.y*delta.y);
      const modulation = Math.min(5, mouseSpeed);

      modulateCurrentSound(modulation);

      lastMouse.x = e.clientX;
      lastMouse.y = e.clientY;
    }
  });

  document.addEventListener('mouseup', () => {
    drawing = false;

    stopModulatingCurrentSound();
    stopCurrentSound();
  });
  
  function loop() {
    if (!running) {
      return;
    }

    render(canvas, ctx);
    handleSounds();

    requestAnimationFrame(loop);
  }

  loop();

  document.body.appendChild(canvas);
}