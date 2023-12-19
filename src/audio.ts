import { WaveForm, samples } from './samples';
import { FADE_OUT_TIME, MIDDLE_NOTE, TUNING_CONSTANT } from './constants';
import { timeSince } from './utilities';

let context: AudioContext = null;
let compressor: DynamicsCompressorNode = null;

export interface Sound {
  node: AudioBufferSourceNode
  _gain: GainNode
  _reverbGain: GainNode
  _startTime: number
  _endTime: number
}

const sounds: Sound[] = [];
let currentSound: Sound = null;
let currentSoundBaseFrequency: number = null;

/**
 * @internal
 */
function initializeContextAndGlobalNodes() {
  context = new AudioContext({
    sampleRate: 44100
  });

  compressor = context.createDynamicsCompressor();

  compressor.threshold.value = -30;
  compressor.knee.value = 10;
  compressor.ratio.value = 5;
  compressor.attack.value = 0;
  compressor.release.value = 1;

  compressor.connect(context.destination);
}

/**
 * @todo pre-define audio buffers per sequence channel
 *
 * @internal
 */
function createWaveFormAudioBuffer(waveForm: WaveForm): AudioBuffer {
  const rate = context.sampleRate;
  const buffer = context.createBuffer(1, rate, rate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i++) {
    data[i] = waveForm[i % waveForm.length];
  }

  return buffer;
}

/**
 * @internal
 */
function fadeOutSound(sound: Sound) {
  sound._gain.gain.value = sound._gain.gain.value;
  sound._gain.gain.linearRampToValueAtTime(0, context.currentTime + FADE_OUT_TIME / 1000);
}

/**
 * @internal
 */
function stopSound(sound: Sound) {
  sound.node.stop(context.currentTime);
  sound.node.disconnect();
  sound._gain.disconnect();
}

export function getContext(): AudioContext {
  return context;
}

export function getFrequency(note: number) {
  return Math.pow(TUNING_CONSTANT, note - MIDDLE_NOTE) * 440;
}

export function ensureContext(): void {
  if (!context) {
    initializeContextAndGlobalNodes();
  }
}

export function createReverb(): ConvolverNode {
  const reverb = context.createConvolver();
  const impulse = context.createBuffer(2, 1 * context.sampleRate, context.sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < left.length; i++) {
    left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / left.length, 3);
    right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / right.length, 3);
  }

  reverb.buffer = impulse;

  // @todo allow this to be done manually by the consumer
  reverb.connect(compressor);

  return reverb;
}

export function createSound(waveForm: WaveForm, note: number, startOffset = 0): Sound {
  ensureContext();

  const node = context.createBufferSource();
  const _gain = context.createGain();
  const _reverbGain = context.createGain();
  const startTime = context.currentTime + startOffset + 0.01;

  node.loop = true;
  node.detune.value = 100 * (note - MIDDLE_NOTE);
  node.playbackRate.value = 1;

  // @todo see if we can get rid of this whole thing
  currentSoundBaseFrequency = node.detune.value;

  node.buffer = createWaveFormAudioBuffer(waveForm);

  _gain.gain.value = 0;
  _reverbGain.gain.value = 0;

  node.start(startTime);

  node.connect(_gain);
  node.connect(_reverbGain);
  _gain.connect(compressor);

  return {
    node,
    _gain,
    _reverbGain,
    _startTime: startTime,
    _endTime: -1
  };
}

export function startNewSound(waveForm: WaveForm, note: number): Sound {
  const sound = createSound(waveForm, note);

  currentSound = sound;

  sounds.push(currentSound);

  return sound;
}

export function setCurrentSoundNote(note: number) {
  if (!currentSound) {
    return;
  }

  // currentSound.node.frequency.value = getFrequency(note);
  currentSound.node.detune.value = 100 * (note - MIDDLE_NOTE);
  // currentSoundBaseFrequency = currentSound.node.frequency.value;
}

export function stopCurrentSound() {
  if (!currentSound) {
    return;
  }

  currentSound._endTime = Date.now();

  fadeOutSound(currentSound);
}

export function endSound(sound: Sound) {
  sound._endTime = Date.now();

  fadeOutSound(sound);

  sound.node.stop(context.currentTime + FADE_OUT_TIME);
}

export function handleSounds() {
  let i = 0;

  while (i < sounds.length) {
    const sound = sounds[i];
    const ended = sound._endTime > -1 && timeSince(sound._endTime) > FADE_OUT_TIME;

    if (ended) {
      stopSound(sound);

      if (sound === currentSound) {
        currentSound = null;
      }

      sounds.splice(i, 1);
    } else {
      i++;
    }
  }
}