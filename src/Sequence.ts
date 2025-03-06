import type { Instrument, WaveForm } from './samples';
import type { Sound } from './audio';
import * as audio from './audio';
import { samples } from './samples';

type WebAudioNode = OscillatorNode | AudioBufferSourceNode
type SequenceEventHandler<D> = (data?: D) => void
type SequenceEvent = 'play' | 'stop' | 'ended' | 'note-start' | 'note-end' | 'create-channel'

// @todo use a non-repeatable ID generator
const generateChannelId = () => Math.random().toString().split('.')[1];

// @todo use a non-repeatable ID generator
const generateNoteId = () => Math.random().toString().split('.')[1];

export interface SequenceNote {
  note: number // @todo use a range + linearRampToValueAtTime()
  offset: number
  duration: number
  channelId?: string
  noteId?: string
}

export interface ChannelConfig {
  wave: WaveForm
  volume: number,
  attack: number
  release: number
  reverb: number
}

export interface Channel {
  id: string
  name: string
  config: ChannelConfig
  fx: {
    reverb: ConvolverNode
  }
  notes: SequenceNote[]
}

const DEFAULT_CHANNEL_CONFIG: ChannelConfig = {
  wave: [ ...samples.square ],
  volume: 1,
  attack: 0,
  release: 0,
  reverb: 0
};

export default class Sequence {
  private channels: Channel[] = [];
  private queuedNodes: WebAudioNode[] = [];
  private pendingNotes: SequenceNote[] = [];
  private events: Record<string, SequenceEventHandler<any>[]> = {};
  private playing = false;
  private playStartTime = 0;

  public addNoteToChannel(channelId: string, note: SequenceNote): void {
    const channel = this.findChannel(channelId) || this.createChannel('Test Channel');

    channel.notes.push(note);

    this.callEventHandlers('create-channel', channel);
    this.sortChannelNotes(channelId);
  }

  // @todo make attack + release more dramatic
  public applyChannelFx(sound: Sound, channel: Channel): void {
    const { config, fx } = channel;
    const { _gain, _reverbGain } = sound;
    const duration = sound._endTime < 0 ? 1 : sound._endTime - sound._startTime;
    const adjustedAttack = Math.min(5 * config.attack, duration);
    const adjustedVolume = Math.pow(config.volume, 3);
    const peakVolume = (1 - config.reverb) * adjustedVolume;

    if (sound._endTime > 0) {
      sound.node.stop(sound._endTime + config.release);
    }

    // Reverb
    _reverbGain.connect(fx.reverb);

    // Attack (main)
    _gain.gain.setValueAtTime(0, sound._startTime);
    _gain.gain.linearRampToValueAtTime(peakVolume, sound._startTime + adjustedAttack);

    if (config.release > 0 && sound._endTime > 0) {
      // Release (main)
      _gain.gain.linearRampToValueAtTime(peakVolume, sound._endTime);
      _gain.gain.linearRampToValueAtTime(0, sound._endTime + config.release);
    }

    // Attack (reverb)
    _reverbGain.gain.setValueAtTime(0, sound._startTime);
    _reverbGain.gain.linearRampToValueAtTime(config.reverb * adjustedVolume, sound._startTime + adjustedAttack);

    if (config.reverb > 0 && config.release > 0 && sound._endTime > 0) {
      // Release (reverb)
      sound._reverbGain.gain.setValueAtTime(config.reverb * adjustedVolume, sound._endTime);
      sound._reverbGain.gain.linearRampToValueAtTime(0, sound._endTime + config.release);
    }
  }

  public createChannel(name: string): Channel {
    audio.ensureContext();

    const channel: Channel = {
      id: generateChannelId(),
      name,
      config: DEFAULT_CHANNEL_CONFIG,
      fx: {
        reverb: audio.createReverb()
      },
      notes: []
    };

    this.channels.push(channel);

    return channel;
  }

  public createNote(note: SequenceNote): SequenceNote {
    return {
      ...note,
      noteId: generateNoteId()
    };
  }

  public getChannels(): Channel[] {
    return this.channels;
  }

  public findChannel(channelId: string): Channel {
    return this.channels.find(channel => channel.id === channelId);
  }

  public findNote(channelId: string, noteId: string): SequenceNote {
    return this.findChannel(channelId)?.notes.find(note => note.noteId === noteId);
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

  public on(event: 'play', handler: SequenceEventHandler<void>): void;
  public on(event: 'stop', handler: SequenceEventHandler<void>): void;
  public on(event: 'ended', handler: SequenceEventHandler<void>): void;
  public on(event: 'note-start', handler: SequenceEventHandler<SequenceNote>): void;
  public on(event: 'note-end', handler: SequenceEventHandler<SequenceNote>): void;
  public on(event: 'create-channel', handler: SequenceEventHandler<Channel>): void;
  public on(event: SequenceEvent, handler: SequenceEventHandler<any>) {
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
        const { note, offset, duration } = sequenceNote;
        const sound = audio.createSound(channel.config.wave, note, offset);
        const stopTime = currentTime + offset + duration;

        sound._endTime = stopTime;

        this.applyChannelFx(sound, channel);

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

    // @todo see if this needs to be optimized
    this.pendingNotes.sort((a, b) => {
      return a.offset > b.offset ? 1 : -1;
    });

    lastNode?.addEventListener('ended', () => {
      this.callEventHandlers('ended');

      this.playing = false;
    });

    this.callEventHandlers('play');
  }

  public removeNoteFromChannel(channelId: string, noteId: string): void {
    const channel = this.findChannel(channelId);

    if (channel) {
      const index = channel.notes.findIndex(note => note.noteId === noteId);

      channel.notes.splice(index, 1);
    }
  }

  public sortChannelNotes(channelId: string): void {
    const channel = this.findChannel(channelId);

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

  public updateChannelConfig(channelId: string, config: Partial<ChannelConfig>): void {
    const channel = this.findChannel(channelId) || this.createChannel('Test Channel');

    if (channel) {
      channel.config = {
        ...channel.config,
        ...config
      };
    }
  }

  private callEventHandlers(event: 'play'): void;
  private callEventHandlers(event: 'stop'): void;
  private callEventHandlers(event: 'ended'): void;
  private callEventHandlers(event: 'note-start', note: SequenceNote): void;
  private callEventHandlers(event: 'note-end', note: SequenceNote): void;
  private callEventHandlers(event: 'create-channel', channel: Channel): void;
  private callEventHandlers(event: SequenceEvent, data?: any): void {
    this.events[event]?.forEach(handler => handler(data));
  }
}