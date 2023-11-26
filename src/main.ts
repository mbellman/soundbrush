import { createCanvas } from './canvas';
import * as visuals from './visuals';
import * as audio from './audio';
import { Settings, State, Vec2 } from './types';
import { MIDDLE_NOTE } from './constants';
import Sequence from './Sequence';
import './styles.scss';

const noteElements: HTMLElement[] = [];

const settings: Settings = {
  // @todo use blending for microtonal note colors
  microtonal: false,
  divisions: 25
};

const state: State = {
  selectedInstrument: 'bass',
  scroll: { x: 0, y: 0 },
  running: true,
  drawing: false,
  playing: false,
  mouse: { x: 0, y: 0 },
  dragStart: { x: 0, y: 0 },
  heldKeys: {},
  sequence: new Sequence(),
  history: []
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
  // visuals.saveDrawPoint(x, y, visuals.noteToColor(note));
}

const DEFAULT_NOTE_LENGTH = 20;

/**
 * @internal
 */
function createNoteElement(note: number): HTMLElement {
  const element = document.createElement('div');
  const topNote = MIDDLE_NOTE + Math.round(state.scroll.y / 50);
  const noteBarHeight = window.innerHeight / settings.divisions;
  const yOffset = (topNote - note) * noteBarHeight + 5;
  const colorString = visuals.colorToRgbString(visuals.noteToColor(note));

  element.classList.add('note');

  element.style.top = `${yOffset}px`;
  element.style.left = `${state.mouse.x}px`;
  element.style.width = `${DEFAULT_NOTE_LENGTH}px`;
  element.style.height = `${noteBarHeight - 10}px`;
  element.style.backgroundColor = colorString;
  element.style.boxShadow = `0 0 10px 0 ${colorString}`;

  document.body.appendChild(element);

  return element;
}

/**
 * @internal
 */
function getLastNoteElement(): HTMLElement {
  return noteElements[noteElements.length - 1];
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

  state.dragStart = {
    x: e.clientX,
    y: e.clientY
  };

  audio.stopModulatingCurrentSound();
  audio.stopCurrentSound();

  // visuals.createNewBrushStroke();
  audio.startNewSound(state.selectedInstrument, 0);

  const noteIndex = getNoteAtYCoordinate(e.clientY);

  // @todo add history action

  const { sequence } = state;

  const note = sequence.createNote({
    instrument: state.selectedInstrument,
    frequency: audio.getFrequency(noteIndex),
    offset: state.mouse.x / 400,
    // @todo adjust duration as note element is stretched
    duration: 0.5
  });

  state.history.push({
    action: 'add',
    note
  });

  sequence.addNoteToChannel(state.selectedInstrument, note);
  noteElements.push(createNoteElement(noteIndex));

  document.body.style.cursor = 'e-resize';
}

/**
 * @internal
 */
function onMouseMove(e: MouseEvent) {
  if (state.drawing) {
    const lastDelta: Vec2 = {
      x: e.clientX - state.mouse.x,
      y: e.clientY - state.mouse.y
    };

    const totalDelta: Vec2 = {
      x: e.clientX - state.dragStart.x,
      y: e.clientY - state.dragStart.y
    };

    const mouseSpeed = Math.sqrt(lastDelta.x*lastDelta.x + lastDelta.y*lastDelta.y);
    const modulation = Math.min(5, mouseSpeed * 50);

    audio.modulateCurrentSound(modulation);

    if (totalDelta.x > DEFAULT_NOTE_LENGTH) {
      const overflow = totalDelta.x - DEFAULT_NOTE_LENGTH;
      const activeNoteElement = getLastNoteElement();
      const compression = Math.pow(1 - overflow / (overflow + 2000), 2);

      activeNoteElement.style.width = `${totalDelta.x}px`;
      activeNoteElement.style.transform = `scaleY(${compression})`;
    }
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

  getLastNoteElement().style.transform = 'scaleY(1)';

  document.body.style.cursor = 'default';
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
  const lastAction = state.history.pop();

  switch (lastAction.action) {
    case 'add': {
      const { note } = lastAction;

      state.sequence.removeNoteFromChannel(note.instrument, note.id);

      // @temporary
      // @todo resolve the proper note element (e.g. getElementForNoteId())
      if (noteElements.length > 0) {
        document.body.removeChild(getLastNoteElement());
          
        noteElements.pop();
      }

      break;
    }
    case 'remove': {
      // @todo
    }
  }
}

/**
 * @internal
 */
function playSequence(): void {
  state.sequence.play();
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
      playSequence();
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

    // if (state.playing) {
    //   const x = 0;
    //   const y = 0;
    //   const note = getNoteAtYCoordinate(y);

    //   visuals.saveDrawPoint(x, y, visuals.noteToColor(note));
    // }

    visuals.clearScreen(canvas, ctx);
    visuals.drawNoteBars(canvas, ctx, state, settings);
    visuals.render(canvas, ctx);
    audio.handleSounds();

    requestAnimationFrame(loop);
  }

  loop();

  document.body.appendChild(canvas);
}