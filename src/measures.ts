import { createTemplate } from './ui/create-widget';
import { SequenceNote } from './Sequence';
import { State } from './types';
import * as visuals from './visuals';
import './measures.scss';

/**
 * @internal
 */
let roll: HTMLDivElement = null;

/**
 * @internal
 */
function createMeasureBlock() {
  const { root, canvas } = createTemplate(`
    <div class="measure-block">
      <canvas @canvas></canvas>
    </div>
  `);

  return root;
}

export function createMeasureRoll() {
  const { root } = createTemplate(`
    <div @roll class="measure-roll">
    </div>
  `);

  roll = root as HTMLDivElement;

  return root;
}

export function respawnMeasureBlocks(state: State) {
  roll.innerHTML = '';

  const channel = state.sequence.findChannel(state.activeChannelId);

  if (!channel) return;

  if (channel.notes.length === 0) {
    const block = createMeasureBlock();

    roll.appendChild(block);

    block.style.left = '200px';
  } else {
    const finalNote = channel.notes.at(-1);
    // @todo define note offsets in 8th notes, and count the # of 8th notes here
    const totalMeasures = Math.floor((finalNote.offset - 0.5) / 2) + 1;
    const measures: SequenceNote[][] = [];

    // Set up the measures
    for (let i = 0; i < totalMeasures; i++) {
      measures.push([]);
    }

    // Distribute notes into their appropriate measures
    for (const note of channel.notes) {
      // @todo define note offsets in 8th notes, and count the # of 8th notes here
      const measureIndex = Math.floor((note.offset - 0.5) / 2);

      measures[measureIndex].push(note);
    }

    // Display and render the measures
    for (let i = 0; i < measures.length; i++) {
      const measure = measures[i];
      const block = createMeasureBlock();

      roll.appendChild(block);

      block.style.left = `${200 + i * 152}px`;

      const canvas = block.querySelector('canvas');
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#f00';

      for (const { note, offset, duration } of measure) {
        const x = canvas.width * (offset - 0.5) / 2;
        const y = canvas.height - note;
        const width = canvas.width * duration / 2;

        ctx.fillStyle = visuals.colorToRgbString(visuals.noteToColor(note));

        ctx.fillRect(x, y, width, 5);
      }

      // @todo render measure notes
    }
  }
}