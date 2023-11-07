export interface Vec2 {
  x: number
  y: number
}

export interface Settings {
  microtonal: boolean
  divisions: number
}

export interface State {
  scroll: Vec2

  running: boolean
  drawing: boolean
  lastMouse: Vec2
}