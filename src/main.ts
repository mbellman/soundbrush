import { createCanvas } from './canvas';
import * as visuals from './visuals';
import * as audio from './audio';
import { Settings, State, Vec2 } from './types';
import { MIDDLE_NOTE } from './constants';
import './styles.scss';

const settings: Settings = {
  microtonal: false,
  divisions: 25
};

const state: State = {
  scroll: {
    x: 0,
    y: 0
  },

  running: true,
  drawing: false,
  lastMouse: {
    x: 0,
    y: 0
  }
};

/**
 * @internal
 */
function handleDrawAction({ x, y }: Vec2) {
  const divisions = settings.divisions;
  const noteOffset = divisions * (1 - y / window.innerHeight);
  const adjustedNoteOffset = settings.microtonal ? noteOffset : Math.ceil(noteOffset);
  const topNote = MIDDLE_NOTE + Math.round(state.scroll.y / 50);
  const note = (topNote - settings.divisions) + adjustedNoteOffset;

  audio.setCurrentSoundNote(note);
  visuals.saveDrawPoint(x, y, visuals.noteToColor(note));
}

export default function main() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');

  document.addEventListener('mousedown', e => {
    state.drawing = true;
 
    state.lastMouse = {
      x: e.clientX,
      y: e.clientY
    };

    visuals.createNewBrushStroke();
    audio.startNewSound('electricPiano', 0);
  });

  document.addEventListener('mousemove', e => {
    if (state.drawing) {
      const delta: Vec2 = {
        x: e.clientX - state.lastMouse.x,
        y: e.clientY - state.lastMouse.y
      };

      // @todo use mouse speed to control sound behavior
      const mouseSpeed = Math.sqrt(delta.x*delta.x + delta.y*delta.y);
      const modulation = Math.min(5, mouseSpeed * 50);

      audio.modulateCurrentSound(modulation);
    }

    state.lastMouse.x = e.clientX;
    state.lastMouse.y = e.clientY;
  });

  document.addEventListener('mouseup', () => {
    state.drawing = false;

    audio.stopModulatingCurrentSound();
    audio.stopCurrentSound();
  });

  document.addEventListener('wheel', e => {
    state.scroll.y -= e.deltaY;
  });
  
  function loop() {
    if (!state.running) {
      return;
    }

    if (state.drawing) {
      handleDrawAction(state.lastMouse);
    }

    visuals.clearScreen(canvas, ctx);
    visuals.drawNoteBars(canvas, ctx, state.lastMouse.y, state, settings);
    visuals.render(canvas, ctx);
    audio.handleSounds();

    requestAnimationFrame(loop);
  }

  loop();

  document.body.appendChild(canvas);
}