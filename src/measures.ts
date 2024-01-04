import { createTemplate } from './ui/create-widget';
import { SequenceNote } from './Sequence';
import { State } from './types';
import './measures.scss';

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

  if (channel && channel.notes.length > 0) {
    const finalNote = channel.notes.at(-1);
    // @todo define note offsets in 8th notes, and count the # of 8th notes here
    const totalMeasures = Math.floor((finalNote.offset - 0.5) / 2) + 1;
    const measures: SequenceNote[][] = [];

    for (let i = 0; i < totalMeasures; i++) {
      measures.push([]);
    }

    for (const note of channel.notes) {
      // @todo define note offsets in 8th notes, and count the # of 8th notes here
      const measureIndex = Math.floor((note.offset - 0.5) / 2);

      measures[measureIndex].push(note);
    }

    for (let i = 0; i < measures.length; i++) {
      const measure = measures[i];
      const block = createMeasureBlock();

      roll.appendChild(block);

      block.style.left = `${200 + i * 152}px`;

      // @todo render measure notes
    }
  }
}