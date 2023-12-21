import Sequence, { SequenceNote } from './Sequence';
import * as audio from './audio';
import * as visuals from './visuals';
import type { BrushStroke } from './visuals';
import { DEFAULT_BEAT_LENGTH, DEFAULT_NOTE_LENGTH, MIDDLE_NOTE } from './constants';
import { Settings, State, Vec2 } from './types';
import { lerp, mod } from './utilities';
import { createCanvas } from './canvas';
import { createChannelManager } from './ui/channel-manager';
import { createScrollButtons } from './ui/scroll-buttons';

let noteContainer: HTMLDivElement = null;
const noteElements: HTMLDivElement[] = []; // @todo eliminate this
const activeNoteElements: HTMLDivElement[] = [];

let playBar: HTMLDivElement = null;

/**
 * @todo description
 */
const brushStrokeMap: Record<string | number, BrushStroke> = {};

// @todo move to core
const settings: Settings = {
  divisions: 25,
  microtonal: false,
  useSnapping: true
};

// @todo move to core
const state: State = {
  activeChannelId: null,
  scroll: { x: 0, y: 0 },
  targetScroll: { x: 0, y: 0 },
  running: true,
  mousedown: false,
  playing: false,
  mouse: { x: 0, y: 0 },
  dragStart: { x: 0, y: 0 },
  hoverTarget: null,
  heldKeys: {},
  sequence: new Sequence(),
  selectedNoteElement: null,
  selectedNoteStartX: 0,
  selectedNoteAction: 'move',
  history: []
};

/**
 * @internal
 */
function findNoteElement(channelId: string, noteId: string): HTMLDivElement {
  return noteContainer.querySelector(`[data-channelId="${channelId}"][data-noteId="${noteId}"]`);
}

/**
 * @internal
 */
function syncNoteElement(channelId: string, noteId: string) {
  const element = findNoteElement(channelId, noteId);
  const sequenceNote = state.sequence.findNote(channelId, noteId);

  if (element && sequenceNote) {
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
 * @todo cleanup
 *
 * @internal
 */
function createNoteElement(channelId: string, noteId: string): HTMLDivElement {
  const element = document.createElement('div');
  const progressBar = document.createElement('div');
  const mover = document.createElement('div');
  const resizer = document.createElement('div');

  const noteBarHeight = window.innerHeight / settings.divisions;
  const elementHeight = noteBarHeight - 10;

  element.classList.add('note');

  element.setAttribute('data-channelId', channelId);
  element.setAttribute('data-noteId', noteId);

  element.style.height = `${elementHeight}px`;

  progressBar.classList.add('note--progress');
  mover.classList.add('note--mover');
  resizer.classList.add('note--resizer');

  element.appendChild(progressBar);
  element.appendChild(mover);
  element.appendChild(resizer);

  const activeNoteContainer = noteContainer.querySelector(`[data-channelId="${state.activeChannelId}"]`);

  activeNoteContainer.appendChild(element);

  syncNoteElement(channelId, noteId);

  return element;
}

/**
 * @internal
 */
function syncNoteProperties(noteElement: HTMLElement) {
  const channelId = noteElement.getAttribute('data-channelId');
  const noteId = noteElement.getAttribute('data-noteId');
  const sequenceNote = state.sequence.findNote(channelId, noteId);
  
  if (sequenceNote) {
    const { top: y } = noteElement.getBoundingClientRect();

    sequenceNote.note = getNoteAtYCoordinate(y, !settings.microtonal);
    sequenceNote.offset = noteElement.offsetLeft / 400;
    sequenceNote.duration = noteElement.clientWidth / 400;

    state.sequence.sortChannelNotes(channelId);
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
function getAbsoluteYCoordinateForNote(note: number): number {
  const barHeight = window.innerHeight / settings.divisions;

  return (MIDDLE_NOTE - note) * barHeight;
}

/**
 * @internal
 */
function getWindowYCoordinateForNote(note: number): number {
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
  const canvas = document.querySelector('.note-canvas') as HTMLElement;

  canvas.style.cursor = cursor;
}

/**
 * @internal
 */
function startCurrentChannelSound(): void {
  let currentChannel = state.sequence.findChannel(state.activeChannelId);

  if (!currentChannel) {
    currentChannel = state.sequence.createChannel('Test Channel');
  }

  const sound = audio.startNewSound(currentChannel.config.wave, 0);

  state.sequence.applyChannelFx(sound, currentChannel);
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

  audio.stopCurrentSound();

  startCurrentChannelSound();

  // visuals.createNewBrushStroke();

  // @todo cleanup
  const note = getNoteAtYCoordinate(state.mouse.y, !settings.microtonal);
  const { scroll, mouse, sequence } = state;

  const offset = (
    settings.useSnapping
      ? (Math.floor((scroll.x + mouse.x) / DEFAULT_BEAT_LENGTH) * DEFAULT_BEAT_LENGTH - scroll.x) / 400
      : mouse.x / 400
  ) + state.scroll.x / 400;

  const duration = (settings.useSnapping ? DEFAULT_BEAT_LENGTH : DEFAULT_NOTE_LENGTH) / 400;

  const sequenceNote = sequence.createNote({
    note,
    offset,
    duration,
    channelId: state.activeChannelId
  });

  sequence.addNoteToChannel(state.activeChannelId, sequenceNote);

  state.history.push({
    action: 'add',
    note: sequenceNote
  });

  state.selectedNoteElement = createNoteElement(state.activeChannelId, sequenceNote.noteId);
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

  audio.stopCurrentSound();

  startCurrentChannelSound();

  state.selectedNoteElement = element;
  state.selectedNoteStartX = element.offsetLeft;

  if (state.mouse.x > bounds.right - 17) {
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

  state.hoverTarget = e.target;

  state.mouse.x = e.clientX;
  state.mouse.y = e.clientY;

  visuals.spawnSparkles(state);
}

/**
 * @internal
 */
function onMouseUp(e: MouseEvent) {
  state.mousedown = false;

  audio.stopCurrentSound();

  const { selectedNoteElement } = state;

  if (selectedNoteElement) {
    selectedNoteElement.style.transform = 'scaleY(1)';

    syncNoteProperties(selectedNoteElement);
  }

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

  switch (e.key) {
    case 'ArrowRight':
    case 'd':
      state.targetScroll.x += 500;
      break;
    case 'ArrowLeft':
    case 'a':
      state.targetScroll.x = Math.max(0, state.targetScroll.x - 500);
      break;
    case 'ArrowUp':
    case 'w':
      state.targetScroll.y += 500;
      break;
    case 'ArrowDown':
    case 's':
      state.targetScroll.y -= 500;
      break;      
  }
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
      const { channelId, noteId } = note;

      state.sequence.removeNoteFromChannel(channelId, noteId);

      // @todo cleanup (e.g. removeNoteElement())
      if (noteElements.length > 0) {
        const element = findNoteElement(channelId, noteId);
        const index = noteElements.findIndex(noteElement => noteElement === element);

        element.remove();
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

  // @todo don't do this here
  document.body.appendChild(container);
  
  return container;
}

/**
 * @internal
 */
function createChannelNoteContainer(channelId: string): HTMLDivElement {
  const container = document.createElement('div');

  container.setAttribute('data-channelId', channelId);

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
function focusNotesByChannelId(channelId: string) {
  Array.from(noteContainer.children).forEach((child: HTMLElement) => {
    child.style.opacity = '0.2';
  });

  (noteContainer.querySelector(`[data-channelId="${channelId}"]`) as HTMLElement).style.opacity = '1';
}

/**
 * @internal
 */
function focusAllNotes() {
  Array.from(noteContainer.children).forEach((child: HTMLElement) => {
    child.style.opacity = '1';
  });
}

/**
 * @internal
 */
function predictNextNote(note: number, channelId: string, startTime: number, beatsAheadLimit: number): SequenceNote {
  const pendingNotes = state.sequence.getPendingNotes();
  const offsetLimit = startTime + ((beatsAheadLimit + 1) * DEFAULT_BEAT_LENGTH) / 400;
  let minimumWeight = Number.POSITIVE_INFINITY;
  let nextNote: SequenceNote = null;

  // @todo improve
  for (const sequenceNote of pendingNotes) {
    if (sequenceNote.channelId !== channelId) {
      continue;
    }

    if (sequenceNote.offset > offsetLimit) {
      break;
    }

    const distance = Math.abs(sequenceNote.note - note);

    if (distance > 12) {
      continue;
    }

    const offset = sequenceNote.offset - startTime;
    const weight = offset + distance * 2;

    if (weight < minimumWeight) {
      nextNote = sequenceNote;
      minimumWeight = weight;
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
    const channelId = element.getAttribute('data-channelId');
    const noteId = element.getAttribute('data-noteId');
    const bounds = element.getBoundingClientRect();
    const startTime = element.offsetLeft / 400;
    const endTime = (element.offsetLeft + element.clientWidth) / 400;
    const duration = endTime - startTime;
    const progress = (offsetTime - startTime) / duration;

    updateNoteElementProgress(element, progress);

    const x = bounds.left + bounds.width * progress;
    const y = bounds.top + elementHeight / 2;
    const note = getNoteAtYCoordinate(y);
    const color = visuals.noteToColor(note);

    // @todo synchronize with release
    const falloff = progress < 1 ? 0 : 2 * (offsetTime - endTime);
    const ax = x + state.scroll.x;
    const ay = getAbsoluteYCoordinateForNote(note) + elementHeight / 2 + 5 + 50 * Math.pow(falloff, 3);
    const radius = 20 * (falloff > 0 ? Math.pow(1 / (1 + falloff), 3) : 1);

    visuals.saveDrawPointToBrushStroke(brushStrokeMap[noteId], ax, ay, color, radius);

    // @todo predict next note on note start, track running preview lines independently
    const noteBeatLength = element.clientWidth / DEFAULT_BEAT_LENGTH;
    const nextNote = predictNextNote(note, channelId, startTime, noteBeatLength);

    if (nextNote) {
      const nextY = getAbsoluteYCoordinateForNote(nextNote.note) + elementHeight / 2 + 5;
      const nextColor = visuals.noteToColor(nextNote.note);
      const nextNoteProgress = Math.pow((offsetTime - startTime) / (nextNote.offset - startTime), 2);
      // @todo custom easing per preview line
      const previewY = lerp(ay, nextY, nextNoteProgress);
      const blendedColor = visuals.lerpColor(color, nextColor, nextNoteProgress);

      visuals.saveDrawPointToBrushStroke(brushStrokeMap[`next${noteId}`], ax, previewY, blendedColor);
    }
  }
}

export function init() {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');

  noteContainer = createNoteContainer();
  playBar = createPlayBar();

  state.sequence.on('play', () => {
    focusAllNotes();

    noteContainer.classList.add('playing');
    playBar.classList.add('visible');

    for (const element of noteElements) {
      updateNoteElementProgress(element, 0);
    }
  });

  // @todo consolidate with below
  state.sequence.on('stop', () => {
    focusNotesByChannelId(state.activeChannelId);

    noteContainer.classList.remove('playing');
    playBar.classList.remove('visible');

    for (const element of noteElements) {
      updateNoteElementProgress(element, 1);
    }
  });

  // @todo consolidate with above
  state.sequence.on('ended', () => {
    focusNotesByChannelId(state.activeChannelId);

    noteContainer.classList.remove('playing');
    playBar.classList.remove('visible');

    for (const element of noteElements) {
      updateNoteElementProgress(element, 1);
    }
  });

  state.sequence.on('note-start', note => {
    const { channelId, noteId } = note;
    const element = findNoteElement(channelId, noteId);

    activeNoteElements.push(element);

    brushStrokeMap[noteId] = visuals.createNewBrushStroke();
    // @todo purge empty next-note brush strokes
    brushStrokeMap[`next${noteId}`] = visuals.createNewBrushStroke({ radius: 10 });
  });

  state.sequence.on('note-end', note => {
    const { channelId, noteId } = note;
    const element = findNoteElement(channelId, noteId);
    const index = activeNoteElements.findIndex(noteElement => noteElement === element);

    activeNoteElements.splice(index, 1);

    updateNoteElementProgress(element, 1);

    delete brushStrokeMap[noteId];
    delete brushStrokeMap[`next${noteId}`];
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

      noteContainer.style.transform = `translateX(${-state.scroll.x}px) translateY(${state.scroll.y}px)`;
    }

    visuals.clearScreen(canvas, ctx);
    visuals.drawNoteBars(ctx, state, settings);
    visuals.drawBeatLines(ctx, state, settings);
    visuals.drawBrushStrokes(ctx, state);
    visuals.drawSparkles(ctx, state);

    if (state.sequence.isPlaying()) {
      const playBarX = state.sequence.getPlayOffsetTime() * 400 - state.scroll.x;

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

  // UI
  {
    const { sequence } = state;

    // @todo don't do this silly event propagation thing;
    // refactor state management stuff into core
    const channelManager = createChannelManager({
      onChannelPanelAdded: panel => {
        const channelName = `Channel ${sequence.getChannels().length + 1}`;
        const channel = sequence.createChannel(channelName);

        panel.setAttribute('data-channelId', channel.id);
        (panel.querySelector('.channel-panel--name-input') as HTMLInputElement).value = channel.name;

        noteContainer.appendChild(createChannelNoteContainer(channel.id));

        focusNotesByChannelId(channel.id);

        state.activeChannelId = channel.id;
      },
      onChangeChannelName: name => {
        const activeChannel = sequence.findChannel(state.activeChannelId);

        activeChannel.name = name;
      },
      onChangeChannelConfig: config => {
        sequence.updateChannelConfig(state.activeChannelId, config);
      },
      onChannelPanelSelected: panel => {
        state.activeChannelId = panel.getAttribute('data-channelId');

        focusNotesByChannelId(state.activeChannelId);
      }
    });

    const scrollButtons = createScrollButtons(state);
  
    document.body.appendChild(channelManager);
    document.body.appendChild(scrollButtons);
  }
}