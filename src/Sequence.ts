import type { Instrument } from './audio';
import * as audio from './audio';

type WebAudioNode = OscillatorNode | AudioBufferSourceNode
type SequenceEventHandler = () => void

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
  private events: Record<string, SequenceEventHandler[]> = {};

  public addNoteToChannel(instrument: Instrument, note: SequenceNote): void {
    const channel = this.findChannel(instrument) || this.createChannel(instrument);

    channel.notes.push(note);
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

  public on(event: string, handler: () => void) {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    this.events[event].push(handler);
  }

  public removeNoteFromChannel(instrument: Instrument, id: number): void {
    const channel = this.findChannel(instrument);

    if (channel) {
      const index = channel.notes.findIndex(note => note.id === id);

      channel.notes.splice(index, 1);
    }
  }

  public play(): void {
    const { currentTime } = audio.getContext();
    let lastNode: WebAudioNode;
    let highestNoteEnd = 0;

    for (const channel of this.channels) {
      // @todo queue N notes at a time
      const chunk = channel.notes;

      for (const { note, offset, duration } of chunk) {
        const frequency = audio.getFrequency(note);
        const sound = audio.createSound(channel.instrument, 0, offset, frequency);
        const stopTime = currentTime + offset + duration;

        sound._gain.gain.linearRampToValueAtTime(1, stopTime - 0.1);
        sound._gain.gain.linearRampToValueAtTime(0, stopTime);

        sound.node.stop(stopTime);

        this.queuedNodes.push(sound.node);

        if (!lastNode || offset + duration > highestNoteEnd) {
          lastNode = sound.node;
          highestNoteEnd = offset + duration;
        }
      }
    }

    lastNode?.addEventListener('ended', () => {
      this.callEventHandlers('ended');
    });

    this.callEventHandlers('play');
  }

  public stop(): void {
    const { currentTime } = audio.getContext();

    this.callEventHandlers('stop');

    // @todo
  }

  private callEventHandlers(event: string): void {
    this.events[event]?.forEach(handler => handler());
  }
}