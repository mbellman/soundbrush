import Sequence, { SequenceNote } from './Sequence';
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

/**
 * @todo description
 */
const brushStrokeMap: Record<string | number, BrushStroke> = {};

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
  selectedNoteElement: null,
  selectedNoteStartX: 0,
  selectedNoteAction: 'move',
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
  const resizer = document.createElement('div');

  const noteBarHeight = window.innerHeight / settings.divisions;
  const elementHeight = noteBarHeight - 10;

  element.classList.add('note');

  element.setAttribute('data-instrument', instrument);
  element.setAttribute('data-id', String(id));

  element.style.height = `${elementHeight}px`;

  progressBar.classList.add('note--progress');
  resizer.classList.add('note--resizer');

  element.appendChild(progressBar);
  element.appendChild(resizer);

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
    sequenceNote.offset = noteElement.offsetLeft / 400;
    sequenceNote.duration = noteElement.clientWidth / 400;

    state.sequence.sortChannelNotes(instrument);
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
  // visuals.saveDrawPoint(x, y, visuals.noteToColor(visualNote));
}

/**
 * @internal
 */
function setCursor(cursor: string): void {
  const canvas = document.querySelector('.canvas') as HTMLElement;

  canvas.style.cursor = cursor;
}

/**
 * @internal
 */
function onCanvasMouseDown(e: MouseEvent) {
  // @todo factor
  {
    state.mousedown = true;
 
    state.mouse = {
      x: e.clientX,
      y: e.clientY
    };

    state.dragStart = {
      x: e.clientX,
      y: e.clientY
    };
  }

  audio.stopModulatingCurrentSound();
  audio.stopCurrentSound();
  audio.startNewSound(state.selectedInstrument, 0);

  // visuals.createNewBrushStroke();

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

  sequence.addNoteToChannel(state.selectedInstrument, sequenceNote);

  state.history.push({
    action: 'add',
    note: sequenceNote
  });

  state.selectedNoteElement = createNoteElement(state.selectedInstrument, sequenceNote.id);
  state.selectedNoteStartX = state.selectedNoteElement.offsetLeft;
  state.selectedNoteAction = 'resize';

  noteElements.push(state.selectedNoteElement);

  setCursor('e-resize');
}

/**
 * @internal
 */
function getNoteElementFromEvent(e: MouseEvent): HTMLDivElement {
  let element = e.target as HTMLDivElement;

  while (element.className !== 'note') {
    element = element.parentElement as HTMLDivElement;
  }

  return element;
}

/**
 * @internal
 */
function onNoteMouseDown(e: MouseEvent) {
  // @todo factor
  {
    state.mousedown = true;

    state.mouse = {
      x: e.clientX,
      y: e.clientY
    };
  
    state.dragStart = {
      x: e.clientX,
      y: e.clientY
    };
  }

  const element = getNoteElementFromEvent(e);

  if (!element) {
    return;
  }

  const bounds = element.getBoundingClientRect();

  audio.stopModulatingCurrentSound();
  audio.stopCurrentSound();
  audio.startNewSound(state.selectedInstrument, 0);

  state.selectedNoteElement = element;
  state.selectedNoteStartX = element.offsetLeft;

  if (state.mouse.x > bounds.right - 10) {
    state.selectedNoteAction = 'resize';

    setCursor('e-resize');
  } else {
    state.selectedNoteAction = 'move';

    setCursor('grabbing');
  }

  // visuals.createNewBrushStroke();
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
    const { selectedNoteElement } = state;
    const { left, top, bottom } = selectedNoteElement.getBoundingClientRect();
    const baseNoteLength = settings.useSnapping ? DEFAULT_BEAT_LENGTH : DEFAULT_NOTE_LENGTH;
    const baseRightEdge = left + baseNoteLength;

    if (
      state.mouse.x < left ||
      state.mouse.x > baseRightEdge ||
      state.mouse.y < top ||
      state.mouse.y > bottom
    ) {
      const overflow = state.mouse.x - baseRightEdge;
      const compression = Math.pow(1 - overflow / (overflow + 2000), 2);
      const note = getNoteAtYCoordinate(state.mouse.y, !settings.microtonal);
      const noteBarHeight = window.innerHeight / settings.divisions;
      const elementHeight = noteBarHeight - 10;
      const yOffset = (MIDDLE_NOTE - note) * noteBarHeight + (settings.microtonal ? -elementHeight / 2 : 5);
      const colorString = visuals.colorToRgbString(visuals.noteToColor(note + (settings.microtonal ? 0.5 : 0)));

      // visuals.saveDrawPoint(state.mouse.x, state.mouse.y, visuals.noteToColor(note + (settings.microtonal ? 0.5 : 0)));

      const dragOverflow = settings.useSnapping
        ? Math.round(overflow / baseNoteLength) * baseNoteLength
        : overflow;

      const noteLength = Math.max(baseNoteLength, baseNoteLength + dragOverflow);

      if (state.selectedNoteAction === 'resize') {
        selectedNoteElement.style.width = `${noteLength}px`;
      } else if (state.selectedNoteAction === 'move') {
        const targetX = settings.useSnapping
          ? Math.round((state.selectedNoteStartX + totalDelta.x) / DEFAULT_BEAT_LENGTH) * DEFAULT_BEAT_LENGTH
          : state.mouse.x;

        selectedNoteElement.style.left = `${targetX}px`;
      }
      
      selectedNoteElement.style.top = `${yOffset}px`;
      selectedNoteElement.style.transform = `scaleY(${compression})`;
      selectedNoteElement.style.backgroundColor = colorString;
      selectedNoteElement.style.border = `2px solid ${colorString}`;
      selectedNoteElement.style.boxShadow = `0 0 10px 0 ${colorString}`;

      (selectedNoteElement.firstChild as HTMLDivElement).style.backgroundColor = colorString;
    }
  }

  state.mouse.x = e.clientX;
  state.mouse.y = e.clientY;

  visuals.spawnSparkles(state);
}

/**
 * @internal
 */
function onMouseUp(e: MouseEvent) {
  state.mousedown = false;

  audio.stopModulatingCurrentSound();
  audio.stopCurrentSound();

  const { selectedNoteElement } = state;

  selectedNoteElement.style.transform = 'scaleY(1)';

  syncNoteProperties(selectedNoteElement);
  setCursor('pointer');
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

  // if (e.key === ' ') {
  //   state.running = false;
  // }
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
function predictNextNote(note: number, beatsAheadLimit: number): SequenceNote {
  const offsetTime = state.sequence.getPlayOffsetTime();
  const offsetLimit = offsetTime + (beatsAheadLimit * DEFAULT_BEAT_LENGTH) / 400;
  const pendingNotes = state.sequence.getPendingNotes();
  let minimumDistance = Number.POSITIVE_INFINITY;
  let nextNote: SequenceNote = null;
  
  // @todo improve
  for (const sequenceNote of pendingNotes) {
    if (sequenceNote.offset > offsetLimit) {
      break;
    }

    const distance = Math.abs(sequenceNote.note - note);

    if (distance < minimumDistance) {
      nextNote = sequenceNote;
      minimumDistance = distance;
    }
  }

  return nextNote;
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
    const note = getNoteAtYCoordinate(y);
    const color = visuals.noteToColor(note);

    visuals.saveDrawPointToBrushStroke(brushStrokeMap[id], x, y, color);

    // @todo improve
    const nextNote = predictNextNote(note, element.clientWidth / DEFAULT_BEAT_LENGTH);

    if (nextNote) {
      const nextY = getYCoordinateForNote(nextNote.note) + elementHeight / 2 + 5;
      const nextColor = visuals.noteToColor(nextNote.note);
      const nextNoteProgress = Math.pow((offsetTime - start) / (nextNote.offset - start), 2);
      const previewY = lerp(y, nextY, nextNoteProgress);

      nextColor.r *= nextNoteProgress;
      nextColor.g *= nextNoteProgress;
      nextColor.b *= nextNoteProgress;
  
      visuals.saveDrawPointToBrushStroke(brushStrokeMap[`next${id}`], x, previewY, nextColor);
    }
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
    // @todo purge empty next-note brush strokes
    brushStrokeMap[`next${note.id}`] = visuals.createNewBrushStroke({ radius: 10 });
  });

  state.sequence.on('note-end', note => {
    const element = findNoteElement(note.instrument, note.id);
    const index = activeNoteElements.findIndex(noteElement => noteElement === element);

    activeNoteElements.splice(index, 1);

    updateNoteElementProgress(element, 1);

    delete brushStrokeMap[note.id];
  });

  document.addEventListener('mousedown', e => {
    if (state.sequence.isPlaying()) {
      return;
    }

    const element = e.target as HTMLElement;

    if (element === canvas) {
      onCanvasMouseDown(e);
    } else if (element.className.startsWith('note')) {
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

    visuals.clearScreen(canvas, ctx);
    visuals.drawNoteBars(ctx, state, settings);
    visuals.drawBeatLines(ctx, state, settings);
    visuals.drawBrushStrokes(ctx);
    visuals.drawSparkles(ctx, state);

    if (state.sequence.isPlaying()) {
      const playBarX = state.sequence.getPlayOffsetTime() * 400;

      playBar.style.left = `${playBarX}px`;

      state.sequence.triggerNoteStartHandlers();

      updateActiveNoteElements();

      // @todo render continuities between notes
    } else {
      visuals.drawNotePreview(ctx, state, settings);      
    }

    audio.handleSounds();

    requestAnimationFrame(loop);
  }

  loop();

  document.body.appendChild(canvas);
}