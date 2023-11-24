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

// @todo convert to a class
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
  playing: boolean
  mouse: Vec2
  dragStart: Vec2
  heldKeys: Record<string, boolean>
  sequence: Sequence
}