let context: AudioContext = null;
let gain: GainNode = null;

export function createTone(): OscillatorNode {
  if (!context) {
    context = new AudioContext({
      sampleRate: 44100
    });

    gain = new GainNode(context);

    gain.connect(context.destination);
  }

  const node = context.createOscillator();

  node.connect(gain);

  node.frequency.value = 440;
  node.start(context.currentTime);

  return node;
}

export function stopTone(tone: OscillatorNode) {
  tone.stop(context.currentTime);
  tone.disconnect();
}