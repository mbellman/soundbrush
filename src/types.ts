import Sequence, { Note } from './Sequence';
import { Instrument } from './audio';

export interface Vec2 {
  x: number
  y: number
}

interface HistoryAction {
  action: 'add' | 'remove'
  note?: Note
}

export interface Settings {
  microtonal: boolean
  divisions: number
}

export interface State {
  selectedInstrument: Instrument
  scroll: Vec2
  targetScroll: Vec2
  running: boolean
  drawing: boolean
  playing: boolean
  mouse: Vec2
  dragStart: Vec2
  heldKeys: Record<string, boolean>
  sequence: Sequence
  history: HistoryAction[]
}