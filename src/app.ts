import Sequence from './Sequence';
import * as audio from './audio';
import * as visuals from './visuals';
import type { BrushStroke } from './visuals';
import { MIDDLE_NOTE } from './constants';
import { Settings, State, Vec2 } from './types';
import { lerp, mod } from './utilities';
import { createCanvas } from './canvas';

let noteContainer: HTMLDivElement = null;
const noteElements: HTMLDivElement[] = [];
const activeNoteElements: HTMLDivElement[] = [];

let playBar: HTMLDivElement = null;

const brushStrokeMap: Record<number, BrushStroke> = {};

const settings: Settings = {
  microtonal: false,
  divisions: 25
};

const state: State = {
  selectedInstrument: 'bass',
  scroll: { x: 0, y: 0 },
  targetScroll: { x: 0, y: 0 },
  running: true,
  drawing: false,
  playing: false,
  mouse: { x: 0, y: 0 },
  dragStart: { x: 0, y: 0 },
  heldKeys: {},
  sequence: new Sequence(),
  lastNoteY: -1,
  lastNoteTime: -1,
  history: []
};

const DEFAULT_NOTE_LENGTH = 20;

/**
 * @internal
 */
function getNoteElementById(id: number): HTMLDivElement {
  return noteContainer.querySelector(`[data-id="${id}"]`);
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
function syncNoteElement(id: number) {
  const element = getNoteElementById(id);

  if (element) {
    const sequenceNote = state.sequence.findNote(state.selectedInstrument, id);
    const noteBarHeight = window.innerHeight / settings.divisions;
    const elementHeight = noteBarHeight - 10;
    const yOffset = (MIDDLE_NOTE - sequenceNote.note) * noteBarHeight + (settings.microtonal ? -elementHeight / 2 : 5);
    const colorString = visuals.colorToRgbString(visuals.noteToColor(sequenceNote.note + (settings.microtonal ? 0.5 : 0)));

    element.style.top = `${yOffset}px`;
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
function createNoteElementFromId(id: number): HTMLDivElement {
  const element = document.createElement('div');
  const progressBar = document.createElement('div');

  const noteBarHeight = window.innerHeight / settings.divisions;
  const elementHeight = noteBarHeight - 10;

  element.classList.add('note');
  element.setAttribute('data-id', String(id));

  element.style.left = `${state.mouse.x}px`;
  element.style.width = `${DEFAULT_NOTE_LENGTH}px`;
  element.style.height = `${elementHeight}px`;

  progressBar.classList.add('note--progress');

  element.appendChild(progressBar);
  noteContainer.appendChild(element);

  syncNoteElement(id);

  return element;
}

/**
 * @internal
 */
function syncNoteProperties(noteElement: HTMLElement) {
  const noteId = Number(noteElement.getAttribute('data-id'));
  const sequenceNote = state.sequence.findNote(state.selectedInstrument, noteId);
  
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

  visuals.createNewBrushStroke();
  audio.startNewSound(state.selectedInstrument, 0);

  // @todo cleanup
  const note = getNoteAtYCoordinate(state.mouse.y, !settings.microtonal);
  const { sequence } = state;

  const sequenceNote = sequence.createNote({
    instrument: state.selectedInstrument,
    note,
    // @todo align to beat markers
    offset: state.mouse.x / 400,
    // @todo adjust duration as note element is stretched
    duration: 0.5
  });

  state.history.push({
    action: 'add',
    note: sequenceNote
  });

  sequence.addNoteToChannel(state.selectedInstrument, sequenceNote);
  noteElements.push(createNoteElementFromId(sequenceNote.id));

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

    // @todo cleanup
    if (totalDelta.x > DEFAULT_NOTE_LENGTH) {
      const overflow = totalDelta.x - DEFAULT_NOTE_LENGTH;
      const activeNoteElement = getLastNoteElement();
      const compression = Math.pow(1 - overflow / (overflow + 2000), 2);

      const note = getNoteAtYCoordinate(state.mouse.y, !settings.microtonal);
      const noteBarHeight = window.innerHeight / settings.divisions;
      const elementHeight = noteBarHeight - 10;
      const yOffset = (MIDDLE_NOTE - note) * noteBarHeight + (settings.microtonal ? -elementHeight / 2 : 5);
      const colorString = visuals.colorToRgbString(visuals.noteToColor(note + (settings.microtonal ? 0.5 : 0)));

      activeNoteElement.style.width = `${totalDelta.x}px`;
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
  state.drawing = false;

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

      // @todo cleanup (e.g. removeNoteElementById())
      if (noteElements.length > 0) {
        const element = getNoteElementById(note.id);
        const index = noteElements.findIndex(noteElement => noteElement === element);

        noteContainer.removeChild(getNoteElementById(note.id));
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
    const element = getNoteElementById(note.id);

    activeNoteElements.push(element);

    state.lastNoteY = getYCoordinateForNote(note.note);
    state.lastNoteTime = state.sequence.getPlayOffsetTime();

    brushStrokeMap[note.id] = visuals.createNewBrushStroke();
  });

  state.sequence.on('note-end', note => {
    const element = getNoteElementById(note.id);
    const index = activeNoteElements.findIndex(noteElement => noteElement === element);

    activeNoteElements.splice(index, 1);

    updateNoteElementProgress(element, 1);

    delete brushStrokeMap[note.id];
  });

  document.addEventListener('mousedown', onMouseDown);
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

    if (state.drawing) {
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
    visuals.render(canvas, ctx);

    audio.handleSounds();

    requestAnimationFrame(loop);
  }

  loop();

  document.body.appendChild(canvas);
}