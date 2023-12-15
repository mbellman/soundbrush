import { Settings, State } from '../types';
import { createTemplate } from './create-widget';
import './scroll-buttons.scss';

export function createScrollButtons(state: State, settings: Settings) {
  const { root, left, right } = createTemplate(`
    <div class="scroll-buttons">
      <button @left class="scroll-buttons--button left">«</button>
      <button @right class="scroll-buttons--button right">»</button>
    </div>
  `);

  left.addEventListener('click', () => {
    state.targetScroll.x = Math.max(0, state.targetScroll.x - 500);

    (document.activeElement as HTMLButtonElement).blur();    
  });

  right.addEventListener('click', () => {
    state.targetScroll.x += 500;

    (document.activeElement as HTMLButtonElement).blur();    
  });

  return root;
}