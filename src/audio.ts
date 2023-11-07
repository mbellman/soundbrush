import { FADE_OUT_TIME, MIDDLE_NOTE, TUNING_CONSTANT } from './constants';
import { timeSince } from './utilities';

let context: AudioContext = null;
let compressor: DynamicsCompressorNode = null;

interface Sound {
  node: OscillatorNode
  _gain: GainNode
  _startTime: number
  _endTime: number
}

const sounds: Sound[] = [];
let currentSound: Sound = null;
let currentSoundBaseFrequency: number = null;

const synths = {
  electricPiano: new Float32Array([ 0, 1, 0, 0, 1 ]),
  bass: new Float32Array([ 0, 1, 0.8, 0.2, 0.02 ]),
};

export type Instrument = keyof typeof synths

/**
 * @internal
 */
function getFrequency(note: number) {
  return Math.pow(TUNING_CONSTANT, note - MIDDLE_NOTE) * 440;
}

/**
 * @internal
 */
function initializeContextAndGlobalNodes() {
  context = new AudioContext({
    sampleRate: 44100
  });

  compressor = context.createDynamicsCompressor();

  compressor.threshold.value = -50;
  compressor.knee.value = 0;
  compressor.ratio.value = 5;
  compressor.release.value = 0.5;
  
  compressor.connect(context.destination);
}

/**
 * @internal
 */
function createWaveForm(instrument: Instrument): PeriodicWave {
  const real = synths[instrument];
  const imaginary = real.map(() => 0);

  return context.createPeriodicWave(real, imaginary);
}

/**
 * @internal
 */
function createSound(instrument: Instrument, note: number): Sound {
  if (!context) {
    initializeContextAndGlobalNodes();
  }

  const _gain = context.createGain();
  const node = context.createOscillator();

  node.frequency.value = getFrequency(note);
  currentSoundBaseFrequency = node.frequency.value;
  
  node.setPeriodicWave(createWaveForm(instrument));
  node.start(context.currentTime);
  node.connect(_gain);

  _gain.gain.value = 0;
  _gain.gain.linearRampToValueAtTime(1, context.currentTime + 0.01);

  _gain.connect(compressor);

  return {
    node,
    _gain,
    _startTime: Date.now(),
    _endTime: -1
  };
}

/**
 * @internal
 */
function fadeOutSound(sound: Sound) {
  currentSound._gain.gain.value = currentSound._gain.gain.value;
  currentSound._gain.gain.linearRampToValueAtTime(0, context.currentTime + FADE_OUT_TIME / 1000);
}

/**
 * @internal
 */
function stopSound(sound: Sound) {
  sound.node.stop(context.currentTime);
  sound.node.disconnect();
  sound._gain.disconnect();
}

export function startNewSound(instrument: Instrument, note: number) {
  const sound = createSound(instrument, note);

  currentSound = sound;

  sounds.push(currentSound);
}

export function modulateCurrentSound(modulation: number) {
  const unitModulation = Math.sin(context.currentTime * 50);
  const modulationFactor = modulation * Math.min(1, timeSince(currentSound._startTime) / 1000);

  currentSound.node.frequency.value = currentSoundBaseFrequency + unitModulation * modulationFactor;
}

export function stopModulatingCurrentSound() {
  currentSound.node.frequency.linearRampToValueAtTime(currentSoundBaseFrequency, context.currentTime + 0.5);
}

export function setCurrentSoundNote(note: number) {
  currentSound.node.frequency.value = getFrequency(note);
  currentSoundBaseFrequency = currentSound.node.frequency.value;
}

export function stopCurrentSound() {
  currentSound._endTime = Date.now();

  fadeOutSound(currentSound);
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