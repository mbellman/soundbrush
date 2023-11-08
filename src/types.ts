import { Instrument } from './audio';

export interface Vec2 {
  x: number
  y: number
}

export interface Note {
  // @todo use a range + linearRampToValueAtTime()
  frequency: number
  offset: number
  duration: number
}

export interface Measure {
  instrument: Instrument
  notes: Note[]
}

export interface Sequence {
  measures: Measure[]
}

export interface Settings {
  microtonal: boolean
  divisions: number
}

export interface State {
  selectedInstrument: Instrument
  scroll: Vec2
  running: boolean
  drawing: boolean
  lastMouse: Vec2
  heldKeys: Record<string, boolean>
  sequence: Sequence
}