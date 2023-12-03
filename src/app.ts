import Sequence from './Sequence';
import * as audio from './audio';
import * as visuals from './visuals';
import type { Instrument } from './audio';
import type { BrushStroke } from './visuals';
import { DEFAULT_BEAT_LENGTH, DEFAULT_NOTE_LENGTH, MIDDLE_NOTE } from './constants';
import { Settings, State, Vec2 } from './types';
import { lerp, mod } from './utilities';
import { createCanvas } from './canvas';

let noteContainer: HTMLDivElement = null;
const noteElements: HTMLDivElement[] = [];
const activeNoteElements: HTMLDivElement[] = [];

let playBar: HTMLDivElement = null;

const brushStrokeMap: Record<number, BrushStroke> = {};

const settings: Settings = {
  divisions: 25,
  microtonal: false,
  useSnapping: true
};

const state: State = {
  selectedInstrument: 'bass',
  scroll: { x: 0, y: 0 },
  targetScroll: { x: 0, y: 0 },
  running: true,
  mousedown: false,
  playing: false,
  mouse: { x: 0, y: 0 },
  dragStart: { x: 0, y: 0 },
  heldKeys: {},
  sequence: new Sequence(),
  lastNoteY: -1,
  lastNoteTime: -1,
  history: []
};

/**
 * @internal
 */
function findNoteElement(instrument: Instrument, id: number): HTMLDivElement {
  return noteContainer.querySelector(`[data-instrument="${instrument}"][data-id="${id}"]`);
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
function syncNoteElement(instrument: Instrument, id: number) {
  const element = findNoteElement(instrument, id);

  if (element) {
    const sequenceNote = state.sequence.findNote(instrument, id);
    const noteBarHeight = window.innerHeight / settings.divisions;
    const elementHeight = noteBarHeight - 10;
    const xOffset = sequenceNote.offset * 400;
    const yOffset = (MIDDLE_NOTE - sequenceNote.note) * noteBarHeight + (settings.microtonal ? -elementHeight / 2 : 5);
    const colorString = visuals.colorToRgbString(visuals.noteToColor(sequenceNote.note + (settings.microtonal ? 0.5 : 0)));

    element.style.top = `${yOffset}px`;
    element.style.left = `${xOffset}px`;
    element.style.width = `${sequenceNote.duration * 400}px`;
    element.style.backgroundColor = colorString;
    element.style.border = `2px solid ${colorString}`;
    element.style.boxShadow = `0 0 10px 0 ${colorString}`;

    (element.firstChild as HTMLDivElement).style.backgroundColor = colorString;
  }
}

/**
 * @internal 
 */
function updateNoteElementProgress(element: HTMLDivElement, progress: number): void {
  (element.firstChild as HTMLDivElement).style.width = `${progress * 100}%`;
}

/**
 * @internal
 */
function createNoteElement(instrument: Instrument, id: number): HTMLDivElement {
  const element = document.createElement('div');
  const progressBar = document.createElement('div');

  const noteBarHeight = window.innerHeight / settings.divisions;
  const elementHeight = noteBarHeight - 10;

  element.classList.add('note');

  element.setAttribute('data-instrument', instrument);
  element.setAttribute('data-id', String(id));

  element.style.height = `${elementHeight}px`;

  progressBar.classList.add('note--progress');

  element.appendChild(progressBar);
  noteContainer.appendChild(element);

  syncNoteElement(instrument, id);

  return element;
}

/**
 * @internal
 */
function syncNoteProperties(noteElement: HTMLElement) {
  const instrument = noteElement.getAttribute('data-instrument') as Instrument;
  const noteId = Number(noteElement.getAttribute('data-id'));
  const sequenceNote = state.sequence.findNote(instrument, noteId);
  
  if (sequenceNote) {
    const { top: y } = noteElement.getBoundingClientRect();

    sequenceNote.note = getNoteAtYCoordinate(y, !settings.microtonal);
    sequenceNote.duration = noteElement.clientWidth / 400;
  }
}

/**
 * @internal
 */
function getNoteAtYCoordinate(y: number, quantized = true): number {
  const barHeight = window.innerHeight / settings.divisions;
  const topNote = MIDDLE_NOTE + Math.floor(state.scroll.y / barHeight);
  const remainder = mod(state.scroll.y, barHeight);
  const noteOffset = settings.divisions * (1 - (y - remainder) / window.innerHeight);
  const adjustedNoteOffset = quantized ? Math.ceil(noteOffset) : noteOffset;

  return (topNote - settings.divisions) + adjustedNoteOffset;
}

/**
 * @internal
 */
function getYCoordinateForNote(note: number): number {
  const barHeight = window.innerHeight / settings.divisions;
  const remainder = mod(state.scroll.y, barHeight);
  const topNote = MIDDLE_NOTE + Math.floor(state.scroll.y / barHeight);

  return (topNote - note) * barHeight + remainder;
}

/**
 * @internal
 */
function handleDrawAction({ x, y }: Vec2) {
  const noteBarHeight = window.innerHeight / settings.divisions;
  const audioNote = getNoteAtYCoordinate(y, !settings.microtonal);
  const visualNote = getNoteAtYCoordinate(y - noteBarHeight / 2, false);

  audio.setCurrentSoundNote(audioNote);
  visuals.saveDrawPoint(x, y, visuals.noteToColor(visualNote));
}

/**
 * @internal
 */
function onCanvasMouseDown(e: MouseEvent) {
  state.mousedown = true;
 
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

  visuals.createNewBrushStroke();
  audio.startNewSound(state.selectedInstrument, 0);

  // @todo cleanup
  const note = getNoteAtYCoordinate(state.mouse.y, !settings.microtonal);
  const { scroll, mouse, sequence } = state;

  const offset = settings.useSnapping
    ? (Math.floor((scroll.x + mouse.x) / DEFAULT_BEAT_LENGTH) * DEFAULT_BEAT_LENGTH - scroll.x) / 400
    : mouse.x / 400;

  const duration = (settings.useSnapping ? DEFAULT_BEAT_LENGTH : DEFAULT_NOTE_LENGTH) / 400;

  const sequenceNote = sequence.createNote({
    instrument: state.selectedInstrument,
    note,
    offset,
    duration
  });

  state.history.push({
    action: 'add',
    note: sequenceNote
  });

  sequence.addNoteToChannel(state.selectedInstrument, sequenceNote);
  noteElements.push(createNoteElement(state.selectedInstrument, sequenceNote.id));

  document.body.style.cursor = 'e-resize';
}

/**
 * @internal
 */
function onNoteMouseDown(e: MouseEvent) {
  const element = e.target as HTMLElement;
  const instrument = element.getAttribute('data-instrument');
  const id = element.getAttribute('data-id');

  // @todo
}

/**
 * @internal
 */
function onMouseMove(e: MouseEvent) {
  if (state.mousedown) {
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

    // @todo cleanup
    const activeNoteElement = getLastNoteElement();
    const { left, top, bottom } = activeNoteElement.getBoundingClientRect();
    const baseNoteLength = settings.useSnapping ? DEFAULT_BEAT_LENGTH : DEFAULT_NOTE_LENGTH;
    const baseRightEdge = left + baseNoteLength;

    if (
      state.mouse.x > baseRightEdge ||
      state.mouse.y < top ||
      state.mouse.y > bottom
    ) {
      const overflow = state.mouse.x - baseRightEdge;
      const activeNoteElement = getLastNoteElement();
      const compression = Math.pow(1 - overflow / (overflow + 2000), 2);

      const note = getNoteAtYCoordinate(state.mouse.y, !settings.microtonal);
      const noteBarHeight = window.innerHeight / settings.divisions;
      const elementHeight = noteBarHeight - 10;
      const yOffset = (MIDDLE_NOTE - note) * noteBarHeight + (settings.microtonal ? -elementHeight / 2 : 5);
      const colorString = visuals.colorToRgbString(visuals.noteToColor(note + (settings.microtonal ? 0.5 : 0)));
      const noteLength = Math.max(baseNoteLength, baseNoteLength + overflow);

      activeNoteElement.style.width = `${noteLength}px`;
      activeNoteElement.style.top = `${yOffset}px`;
      activeNoteElement.style.transform = `scaleY(${compression})`;
      activeNoteElement.style.backgroundColor = colorString;
      activeNoteElement.style.border = `2px solid ${colorString}`;
      activeNoteElement.style.boxShadow = `0 0 10px 0 ${colorString}`;

      (activeNoteElement.firstChild as HTMLDivElement).style.backgroundColor = colorString;
    }
  }

  state.mouse.x = e.clientX;
  state.mouse.y = e.clientY;
}

/**
 * @internal
 */
function onMouseUp(e: MouseEvent) {
  state.mousedown = false;

  audio.stopModulatingCurrentSound();
  audio.stopCurrentSound();

  // @todo base this on selected element
  const activeNoteElement = getLastNoteElement();

  activeNoteElement.style.transform = 'scaleY(1)';

  syncNoteProperties(activeNoteElement);

  document.body.style.cursor = 'default';
}

/**
 * @internal
 */
function onWheel(e: WheelEvent) {
  state.targetScroll.y -= e.deltaY;
}

/**
 * @internal
 */
function onKeyDown(e: KeyboardEvent) {
  state.heldKeys[e.key] = true;
}

/**
 * @internal
 */
function onKeyUp(e: KeyboardEvent) {
  if (
    e.key === 'z' && state.heldKeys.Control ||
    e.key === 'Backspace'
  ) {
    undoLastAction();
  }

  if (e.key === 'Enter') {
    const { sequence } = state;

    if (sequence.isPlaying()) {
      sequence.stop();
    } else {
      sequence.play();
    }
  }

  state.heldKeys[e.key] = false;
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

      // @todo cleanup (e.g. removeNoteElement())
      if (noteElements.length > 0) {
        const element = findNoteElement(note.instrument, note.id);
        const index = noteElements.findIndex(noteElement => noteElement === element);

        noteContainer.removeChild(findNoteElement(note.instrument, note.id));
        noteElements.splice(index, 1);
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
function createNoteContainer(): HTMLDivElement {
  const container = document.createElement('div');

  container.classList.add('note-container');

  document.body.appendChild(container);
  
  return container;
}

/**
 * @internal
 */
function createPlayBar(): HTMLDivElement {
  const bar = document.createElement('div');

  bar.classList.add('play-bar');

  document.body.appendChild(bar);

  return bar;
}

/**
 * @internal
 */
function updateActiveNoteElements(): void {
  const elementHeight = window.innerHeight / settings.divisions - 10;
  const offsetTime = state.sequence.getPlayOffsetTime();

  for (const element of activeNoteElements) {
    const id = Number(element.getAttribute('data-id'));
    const bounds = element.getBoundingClientRect();
    const start = element.offsetLeft / 400;
    const end = (element.offsetLeft + element.clientWidth) / 400;
    const duration = end - start;
    const progress = (offsetTime - start) / duration;

    updateNoteElementProgress(element, progress);

    const x = bounds.left + bounds.width * progress;
    const y = bounds.top + elementHeight / 2;
    const color = visuals.noteToColor(getNoteAtYCoordinate(y));

    visuals.saveDrawPointToBrushStroke(brushStrokeMap[id], x, y, color);
  }
}

export function init() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');

  noteContainer = createNoteContainer();
  playBar = createPlayBar();

  state.sequence.on('play', () => {
    noteContainer.classList.add('playing');
    playBar.classList.add('visible');

    for (const element of noteElements) {
      updateNoteElementProgress(element, 0);
    }
  });

  // @todo consolidate with below
  state.sequence.on('stop', () => {
    noteContainer.classList.remove('playing');
    playBar.classList.remove('visible');

    for (const element of noteElements) {
      updateNoteElementProgress(element, 1);
    }

    state.lastNoteTime = -1;
    state.lastNoteY = -1;
  });

  // @todo consolidate with above
  state.sequence.on('ended', () => {
    noteContainer.classList.remove('playing');
    playBar.classList.remove('visible');

    for (const element of noteElements) {
      updateNoteElementProgress(element, 1);
    }

    state.lastNoteTime = -1;
    state.lastNoteY = -1;
  });

  state.sequence.on('note-start', note => {
    const element = findNoteElement(note.instrument, note.id);

    activeNoteElements.push(element);

    state.lastNoteY = getYCoordinateForNote(note.note);
    state.lastNoteTime = state.sequence.getPlayOffsetTime();

    brushStrokeMap[note.id] = visuals.createNewBrushStroke();
  });

  state.sequence.on('note-end', note => {
    const element = findNoteElement(note.instrument, note.id);
    const index = activeNoteElements.findIndex(noteElement => noteElement === element);

    activeNoteElements.splice(index, 1);

    updateNoteElementProgress(element, 1);

    delete brushStrokeMap[note.id];
  });

  document.addEventListener('mousedown', e => {
    const element = e.target as HTMLElement;

    if (element === canvas) {
      onCanvasMouseDown(e);
    } else if (element.classList.contains('note')) {
      onNoteMouseDown(e);
    }
  });

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('wheel', onWheel);

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  let lastFrameTime = Date.now();
  
  function loop() {
    if (!state.running) {
      return;
    }

    if (state.mousedown) {
      handleDrawAction(state.mouse);
    }

    const dt = (Date.now() - lastFrameTime) / 1000;

    lastFrameTime = Date.now();

    // Handle scrolling
    {
      state.scroll.x = lerp(state.scroll.x, state.targetScroll.x, dt * 5);
      state.scroll.y = lerp(state.scroll.y, state.targetScroll.y, dt * 5);

      noteContainer.style.transform = `translateY(${state.scroll.y}px)`;
    }

    if (state.sequence.isPlaying()) {
      const playBarX = state.sequence.getPlayOffsetTime() * 400;

      playBar.style.left = `${playBarX}px`;

      state.sequence.triggerNoteStartHandlers();

      updateActiveNoteElements();

      // @todo render continuities between notes
    }

    visuals.clearScreen(canvas, ctx);
    visuals.drawNoteBars(canvas, ctx, state, settings);
    visuals.drawNotePreview(canvas, ctx, state, settings);
    visuals.renderBrushStrokes(canvas, ctx);

    audio.handleSounds();

    requestAnimationFrame(loop);
  }

  loop();

  document.body.appendChild(canvas);
}