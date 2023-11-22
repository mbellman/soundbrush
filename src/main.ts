import { createCanvas } from './canvas';
import * as visuals from './visuals';
import * as audio from './audio';
import { Measure, Settings, State, Vec2 } from './types';
import { MIDDLE_NOTE } from './constants';
import './styles.scss';

const noteElements: HTMLElement[] = [];

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
  mouse: {
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
function createNoteElement(note: number): HTMLDivElement {
  const element = document.createElement('div');
  const topNote = MIDDLE_NOTE + Math.round(state.scroll.y / 50);
  const noteBarHeight = window.innerHeight / settings.divisions;
  const yOffset = (topNote - note) * noteBarHeight + 5;

  element.classList.add('note');

  element.style.top = `${yOffset}px`;
  element.style.left = `${state.mouse.x}px`;
  element.style.width = '100px';
  element.style.height = `${noteBarHeight - 10}px`;
  element.style.backgroundColor = visuals.colorToRgbString(visuals.noteToColor(note));

  document.body.appendChild(element);

  return element;
}

/**
 * @internal
 */
function onMouseDown(e: MouseEvent) {
  state.drawing = true;
 
  state.mouse = {
    x: e.clientX,
    y: e.clientY
  };

  visuals.createNewBrushStroke();
  audio.startNewSound(state.selectedInstrument, 0);

  const note = getNoteAtYCoordinate(e.clientY);

  // @todo add history action

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

  noteElements.push(createNoteElement(note));
}

/**
 * @internal
 */
function onMouseMove(e: MouseEvent) {
  if (state.drawing) {
    const delta: Vec2 = {
      x: e.clientX - state.mouse.x,
      y: e.clientY - state.mouse.y
    };

    const mouseSpeed = Math.sqrt(delta.x*delta.x + delta.y*delta.y);
    const modulation = Math.min(5, mouseSpeed * 50);

    audio.modulateCurrentSound(modulation);
  }

  state.mouse.x = e.clientX;
  state.mouse.y = e.clientY;
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

  // @todo remove placed notes
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
      handleDrawAction(state.mouse);
    }

    visuals.clearScreen(canvas, ctx);
    visuals.drawNoteBars(canvas, ctx, state, settings);
    visuals.render(canvas, ctx);
    audio.handleSounds();

    requestAnimationFrame(loop);
  }

  loop();

  document.body.appendChild(canvas);
}