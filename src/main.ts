import { createCanvas } from './canvas';
import { noteToColor, render, saveDrawPoint, startNewBrushStroke } from './visuals';
import { handleSounds, modulateCurrentSound, setCurrentSoundNote, startNewSound, stopCurrentSound, stopModulatingCurrentSound } from './audio';
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

    const divisions = 20;
    const noteOffset = Math.floor(divisions * (1 - e.clientY / window.innerHeight));
    const note = 30 + noteOffset;

    startNewBrushStroke();
    startNewSound('electricPiano', note);
  });

  document.addEventListener('mousemove', e => {
    if (drawing) {
      const delta: Vec2 = {
        x: e.clientX - lastMouse.x,
        y: e.clientY - lastMouse.y
      };

      // @todo use mouse speed to control sound behavior
      const mouseSpeed = Math.sqrt(delta.x*delta.x + delta.y*delta.y);
      const modulation = Math.min(5, mouseSpeed);

      const divisions = 20;
      const noteOffset = Math.floor(divisions * (1 - e.clientY / window.innerHeight));
      const note = 30 + noteOffset;

      modulateCurrentSound(modulation);
      setCurrentSoundNote(note);
      saveDrawPoint(e.clientX, e.clientY, noteToColor(note));

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