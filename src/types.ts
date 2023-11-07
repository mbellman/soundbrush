import { Instrument } from './audio';

export interface Vec2 {
  x: number
  y: number
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
}