import { FADE_OUT_TIME } from './constants';
import { timeSince } from './utilities';

let context: AudioContext = null;
let gain: GainNode = null;

interface Sound {
  node: AudioScheduledSourceNode
  _gain: GainNode
  _startTime: number
  _endTime: number
}

const sounds: Sound[] = [];
let currentSound: Sound = null;

function createSound(): Sound {
  if (!context) {
    context = new AudioContext({
      sampleRate: 44100
    });

    gain = new GainNode(context);

    gain.connect(context.destination);
  }

  const node = context.createOscillator();
  const _gain = context.createGain();
  
  node.frequency.value = 440;
  
  node.start(context.currentTime);
  node.connect(_gain);

  _gain.connect(context.destination);

  return {
    node,
    _gain,
    _startTime: Date.now(),
    _endTime: -1
  };
}

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

export function stopCurrentSound() {
  currentSound._endTime = Date.now();
}

export function handleSounds() {
  for (let i = 0; i < sounds.length; i++) {
    const sound = sounds[i];
    const ended = sound._endTime > -1;
    const fadeout = ended ? timeSince(sound._endTime) / FADE_OUT_TIME : 0;

    sound._gain.gain.value = 1 - fadeout;

    if (fadeout >= 1) {
      stopSound(sound);

      if (sound === currentSound) {
        currentSound = null;
      }

      sounds.splice(i, 1);
    }
  }
}