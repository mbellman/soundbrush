import { createCanvas } from './canvas';
import * as visuals from './visuals';
import * as audio from './audio';
import { Vec2 } from './types';
import './styles.scss';

/**
 * @internal
 */
function handleDrawAction(x: number, y: number) {
  const divisions = 20;
  const noteOffset = Math.ceil(divisions * (1 - y / window.innerHeight));
  const note = 30 + noteOffset;

  audio.setCurrentSoundNote(note);
  visuals.saveDrawPoint(x, y, visuals.noteToColor(note));
}

export default function main() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');

  let drawing = false;
  let running = true;
  let lastMouse: Vec2 = { x: 0, y: 0 };

  document.addEventListener('mousedown', e => {
    drawing = true;
 
    lastMouse = {
      x: e.clientX,
      y: e.clientY
    };

    visuals.createNewBrushStroke();
    audio.startNewSound('electricPiano', 0);
  });

  document.addEventListener('mousemove', e => {
    if (drawing) {
      const delta: Vec2 = {
        x: e.clientX - lastMouse.x,
        y: e.clientY - lastMouse.y
      };

      // @todo use mouse speed to control sound behavior
      const mouseSpeed = Math.sqrt(delta.x*delta.x + delta.y*delta.y);
      const modulation = Math.min(5, mouseSpeed * 10);

      audio.modulateCurrentSound(modulation);
    }

    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;
  });

  document.addEventListener('mouseup', () => {
    drawing = false;

    audio.stopModulatingCurrentSound();
    audio.stopCurrentSound();
  });
  
  function loop() {
    if (!running) {
      return;
    }

    if (drawing) {
      handleDrawAction(lastMouse.x, lastMouse.y);
    }

    visuals.clearScreen(canvas, ctx);
    visuals.drawNoteBars(canvas, ctx, lastMouse.y, drawing);
    visuals.render(canvas, ctx);
    audio.handleSounds();

    requestAnimationFrame(loop);
  }

  loop();

  document.body.appendChild(canvas);
}