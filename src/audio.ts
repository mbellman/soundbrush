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
 * @todo pre-define audio buffers per channel instrument
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

// @todo use one reverb node per Sequence channel
let reverb: ConvolverNode;

export function createSound(waveForm: WaveForm, note: number, startOffset = 0, attack = 0.01): Sound {
  if (!context) {
    initializeContextAndGlobalNodes();
    // loadImpulse();

    reverb = context.createConvolver();

    const impulse = context.createBuffer(2, 1 * context.sampleRate, context.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < left.length; i++) {
      left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / left.length, 3);
      right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / right.length, 3);
    }

    reverb.buffer = impulse;

    reverb.connect(compressor);
  }

  const _gain = context.createGain();
  const node = context.createBufferSource();
  const startTime = context.currentTime + startOffset + 0.01;

  node.loop = true;
  node.detune.value = 100 * (note - MIDDLE_NOTE);
  node.playbackRate.value = 1;

  // @todo see if we can get rid of this whole thing
  currentSoundBaseFrequency = node.detune.value;

  // @todo cleanup below
  node.buffer = createWaveFormAudioBuffer(waveForm);

  node.start(startTime);

  // @temporary
  const reverbAmount = 0.5;

  _gain.gain.value = 0;

  _gain.gain.linearRampToValueAtTime(0, startTime);
  _gain.gain.linearRampToValueAtTime(1 - reverbAmount, startTime + attack);

  const _reverbGain = context.createGain();

  _reverbGain.gain.value = reverbAmount;

  _reverbGain.gain.linearRampToValueAtTime(0, startTime);
  _reverbGain.gain.linearRampToValueAtTime(reverbAmount, startTime + attack);

  _reverbGain.connect(reverb);

  node.connect(_gain);
  node.connect(_reverbGain);
  _gain.connect(compressor);

  return {
    node,
    _gain,
    _reverbGain,
    // @todo align with startTime
    _startTime: Date.now(),
    _endTime: -1
  };
}

export function startNewSound(waveForm: WaveForm, note: number) {
  const sound = createSound(waveForm, note);

  currentSound = sound;

  sounds.push(currentSound);
}

export function modulateCurrentSound(modulation: number) {
  if (!currentSound) {
    return;
  }

  const unitModulation = Math.sin(context.currentTime * 50);
  const modulationFactor = modulation * Math.min(1, timeSince(currentSound._startTime) / 1000);

  // currentSound.node.frequency.value = currentSoundBaseFrequency + unitModulation * modulationFactor;
}

export function stopModulatingCurrentSound() {
  if (!currentSound) {
    return;
  }

  // currentSound.node.frequency.linearRampToValueAtTime(currentSoundBaseFrequency, context.currentTime + 0.5);
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
  for (let i = 0; i < sounds.length; i++) {
    const sound = sounds[i];
    const ended = sound._endTime > -1 && timeSince(sound._endTime) > FADE_OUT_TIME;

    if (ended) {
      stopSound(sound);

      if (sound === currentSound) {
        currentSound = null;
      }

      sounds.splice(i, 1);
    }
  }
}