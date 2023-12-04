import Sequence, { SequenceNote } from './Sequence';
import { Instrument } from './audio';

export interface Vec2 {
  x: number
  y: number
}

interface HistoryAction {
  action: 'add' | 'remove'
  note?: SequenceNote
}

export interface Settings {
  divisions: number
  microtonal: boolean
  useSnapping: boolean
}

export interface State {
  selectedInstrument: Instrument
  scroll: Vec2
  targetScroll: Vec2
  running: boolean
  mousedown: boolean
  playing: boolean
  mouse: Vec2
  dragStart: Vec2
  heldKeys: Record<string, boolean>
  sequence: Sequence
  lastNoteTime: number
  lastNoteY: number
  selectedNoteElement: HTMLDivElement
  history: HistoryAction[]
}