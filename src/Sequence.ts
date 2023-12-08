import type { Instrument } from './samples';
import * as audio from './audio';
import { samples } from './samples';

type WebAudioNode = OscillatorNode | AudioBufferSourceNode
type SequenceEventHandler = (note?: SequenceNote) => void
type SequenceEvent = 'play' | 'stop' | 'ended' | 'note-start' | 'note-end'

// @todo use a non-repeatable ID generator
const generateNoteId = () => Math.random();

export interface SequenceNote {
  instrument: Instrument
  note: number // @todo use a range + linearRampToValueAtTime()
  offset: number
  duration: number
  id?: number
}

export interface Channel {
  instrument: Instrument
  notes: SequenceNote[]
}

export default class Sequence {
  private channels: Channel[] = [];
  private queuedNodes: WebAudioNode[] = [];
  private pendingNotes: SequenceNote[] = [];
  private events: Record<string, SequenceEventHandler[]> = {};
  private playing = false;
  private playStartTime = 0;

  public addNoteToChannel(instrument: Instrument, note: SequenceNote): void {
    const channel = this.findChannel(instrument) || this.createChannel(instrument);

    channel.notes.push(note);

    this.sortChannelNotes(instrument);
  }

  public createChannel(instrument: Instrument): Channel {
    const channel: Channel = {
      instrument,
      notes: []
    };

    this.channels.push(channel);

    return channel;
  }

  public createNote(note: SequenceNote): SequenceNote {
    return {
      ...note,
      id: generateNoteId()
    };
  }

  public findChannel(instrument: Instrument): Channel {
    return this.channels.find(channel => channel.instrument === instrument);
  }

  public findNote(instrument: Instrument, id: number): SequenceNote {
    return this.findChannel(instrument)?.notes.find(note => note.id === id);
  }

  public getNextNote(): SequenceNote {
    return this.pendingNotes[0];
  }

  public getPendingNotes(): SequenceNote[] {
    return this.pendingNotes;
  }

  public getPlayOffsetTime(): number {
    return audio.getContext().currentTime - this.playStartTime;
  }

  public isPlaying(): boolean {
    return this.playing;
  }

  public on(event: SequenceEvent, handler: SequenceEventHandler) {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push(handler);
  }

  public play(): void {
    this.queuedNodes.length = 0;
    this.pendingNotes.length = 0;
    this.playing = true;
    this.playStartTime = audio.getContext().currentTime;

    const { currentTime } = audio.getContext();
    let lastNode: WebAudioNode;
    let highestNoteEnd = 0;

    for (const channel of this.channels) {
      // @todo queue N notes at a time
      const chunkNotes = channel.notes;

      for (const sequenceNote of chunkNotes) {
        const { instrument, note, offset, duration } = sequenceNote;
        const sound = audio.createSound(samples[instrument], note, offset);
        const stopTime = currentTime + offset + duration;

        sound._gain.gain.linearRampToValueAtTime(1, stopTime - 0.1);
        sound._gain.gain.linearRampToValueAtTime(0, stopTime);

        sound.node.stop(stopTime);

        sound.node.addEventListener('ended', () => {
          this.callEventHandlers('note-end', sequenceNote);
        });

        this.queuedNodes.push(sound.node);
        this.pendingNotes.push(sequenceNote);

        if (!lastNode || offset + duration > highestNoteEnd) {
          lastNode = sound.node;
          highestNoteEnd = offset + duration;
        }
      }
    }

    lastNode?.addEventListener('ended', () => {
      this.callEventHandlers('ended');

      this.playing = false;
    });

    this.callEventHandlers('play');
  }

  public removeNoteFromChannel(instrument: Instrument, id: number): void {
    const channel = this.findChannel(instrument);

    if (channel) {
      const index = channel.notes.findIndex(note => note.id === id);

      channel.notes.splice(index, 1);
    }
  }

  public sortChannelNotes(instrument: Instrument): void {
    const channel = this.findChannel(instrument);

    if (channel) {
      // @todo see if this needs to be optimized
      channel.notes.sort((a, b) => {
        return a.offset > b.offset ? 1 : -1;
      });
    }
  }

  public stop(): void {
    const { currentTime } = audio.getContext();

    this.callEventHandlers('stop');

    for (const node of this.queuedNodes) {
      node.stop(currentTime);
    }

    this.queuedNodes.length = 0;
    this.pendingNotes.length = 0;
    this.playing = false;
  }

  public triggerNoteStartHandlers(): void {
    const time = this.getPlayOffsetTime();

    while (time > this.pendingNotes[0]?.offset) {
      const note = this.pendingNotes.shift();

      this.callEventHandlers('note-start', note);
    }
  }

  private callEventHandlers(event: SequenceEvent, note?: SequenceNote): void {
    this.events[event]?.forEach(handler => handler(note));
  }
}