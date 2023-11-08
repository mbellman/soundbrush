import { createCanvas } from './canvas';
import * as visuals from './visuals';
import * as audio from './audio';
import { Measure, Settings, State, Vec2 } from './types';
import { MIDDLE_NOTE } from './constants';
import './styles.scss';

const settings: Settings = {
  microtonal: false,
  divisions: 25
};

const state: State = {
  selectedInstrument: 'bass',
  scroll: {
    x: 0,
    y: 0
  },
  running: true,
  drawing: false,
  lastMouse: {
    x: 0,
    y: 0
  },
  heldKeys: {},
  sequence: {
    measures: []
  }
};

/**
 * @internal
 */
function getNoteAtYCoordinate(y: number): number {
  const topNote = MIDDLE_NOTE + Math.round(state.scroll.y / 50);
  const noteOffset = settings.divisions * (1 - y / window.innerHeight);
  const adjustedNoteOffset = settings.microtonal ? noteOffset : Math.ceil(noteOffset);

  return (topNote - settings.divisions) + adjustedNoteOffset;
}

/**
 * @internal
 */
function handleDrawAction({ x, y }: Vec2) {
  const note = getNoteAtYCoordinate(y);

  audio.setCurrentSoundNote(note);
  visuals.saveDrawPoint(x, y, visuals.noteToColor(note));
}

/**
 * @internal
 */
function onMouseDown(e: MouseEvent) {
  state.drawing = true;
 
  state.lastMouse = {
    x: e.clientX,
    y: e.clientY
  };

  visuals.createNewBrushStroke();
  audio.startNewSound(state.selectedInstrument, 0);

  const note = getNoteAtYCoordinate(e.clientY);

  // @temporary
  if (state.sequence.measures.length === 0) {
    state.sequence.measures.push({
      instrument: state.selectedInstrument,
      notes: []
    });
  }

  // @temporary
  const measure = state.sequence.measures[0];

  measure.notes.push({
    frequency: audio.getFrequency(note),
    offset: measure.notes.length * 0.2,
    duration: 0.5
  });
}

/**
 * @internal
 */
function onMouseMove(e: MouseEvent) {
  if (state.drawing) {
    const delta: Vec2 = {
      x: e.clientX - state.lastMouse.x,
      y: e.clientY - state.lastMouse.y
    };

    const mouseSpeed = Math.sqrt(delta.x*delta.x + delta.y*delta.y);
    const modulation = Math.min(5, mouseSpeed * 50);

    audio.modulateCurrentSound(modulation);
  }

  state.lastMouse.x = e.clientX;
  state.lastMouse.y = e.clientY;
}

/**
 * @internal
 */
function onMouseUp(e: MouseEvent) {
  state.drawing = false;

  audio.stopModulatingCurrentSound();
  audio.stopCurrentSound();
}

/**
 * @internal
 */
function onWheel(e: WheelEvent) {
  state.scroll.y -= e.deltaY;
}

/**
 * @internal
 */
function undoLastAction() {
  // @temporary
  state.sequence.measures[0].notes.pop();
}

export default function main() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');

  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('wheel', onWheel);

  document.addEventListener('keydown', e => {
    state.heldKeys[e.key] = true;
  });

  document.addEventListener('keyup', e => {
    if (
      e.key === 'z' && state.heldKeys.Control ||
      e.key === 'Backspace'
    ) {
      undoLastAction();
    }

    if (e.key === 'Enter') {
      audio.playSequence(state.sequence);
    }

    state.heldKeys[e.key] = false;
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