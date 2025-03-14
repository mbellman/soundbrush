import Sequence, { SequenceNote } from './Sequence';
import type { Instrument } from './samples';

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
  activeChannelId: string
  sequence: Sequence
  scroll: Vec2
  targetScroll: Vec2
  running: boolean
  mousedown: boolean
  playing: boolean
  useHalfBeatNote: boolean
  mouse: Vec2
  dragStart: Vec2
  hoverTarget: EventTarget
  heldKeys: Record<string, boolean>
  selectedNoteElement: HTMLDivElement
  selectedNoteStartX: number
  selectedNoteAction: 'move' | 'resize'
  history: HistoryAction[]
}