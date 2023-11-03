import { FADE_OUT_TIME, TUNING_CONSTANT } from './constants';

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

/**
 * @internal
 */
function getFrequency(note: number) {
  return Math.pow(TUNING_CONSTANT, note - 49) * 440;
}

const synths = {
  electricPiano: new Float32Array([ 0, 1, 0, 0, 1 ]),
  bass: new Float32Array([ 0, 1, 0.8, 0.2, 0.02 ]),
};

/**
 * @internal
 */
function createWaveForm(): PeriodicWave {
  const instrument = synths.electricPiano;
  const imaginary = instrument.map(() => 0);

  return context.createPeriodicWave(instrument, imaginary);
}

/**
 * @internal
 */
function createSound(): Sound {
  if (!context) {
    // Set up the audio context if it isn't already created
    context = new AudioContext({
      sampleRate: 44100
    });

    compressor = context.createDynamicsCompressor();

    compressor.threshold.value = -50;
    compressor.knee.value = 0;
    compressor.ratio.value = 20;
    compressor.release.value = 1;
    
    compressor.connect(context.destination);
  }

  const _gain = context.createGain();
  const node = context.createOscillator();

  node.frequency.value = getFrequency(30 + Math.round(Math.random() * 20));
  
  node.setPeriodicWave(createWaveForm());
  node.start(context.currentTime);
  node.connect(_gain);

  _gain.gain.value = 0;

  _gain.gain.linearRampToValueAtTime(0, context.currentTime);
  _gain.gain.linearRampToValueAtTime(1, context.currentTime + 0.1);

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

export function startNewSound() {
  const sound = createSound();

  currentSound = sound;

  sounds.push(currentSound);
}

export function setCurrentSoundVolume(volume: number) {
  // @todo
}

export function stopCurrentSound() {
  currentSound._endTime = Date.now();

  fadeOutSound(currentSound);
}

export function handleSounds() {
  for (let i = 0; i < sounds.length; i++) {
    const sound = sounds[i];
    const ended = sound._endTime > -1;

    if (ended && sound._gain.gain.value < 0.0001) {
      stopSound(sound);

      if (sound === currentSound) {
        currentSound = null;
      }

      sounds.splice(i, 1);
    }
  }
}