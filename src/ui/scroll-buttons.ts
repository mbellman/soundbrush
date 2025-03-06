import { Settings, State } from '../types';
import { createTemplate } from './create-widget';
import './scroll-buttons.scss';

export function createScrollButtons(state: State) {
  const { root, left, right } = createTemplate(`
    <div class="scroll-buttons">
      <button @left class="scroll-buttons--button left">«</button>
      <button @right class="scroll-buttons--button right">»</button>
    </div>
  `);

  function showLeftButton() {
    left.style.opacity = '1';
    left.style.pointerEvents = 'all';
  }

  function hideLeftButton() {
    left.style.opacity = '0';
    left.style.pointerEvents = 'none';
  }

  left.addEventListener('click', () => {
    state.targetScroll.x = Math.max(0, state.targetScroll.x - 500);

    if (state.targetScroll.x === 0) {
      hideLeftButton();
    }

    (document.activeElement as HTMLButtonElement).blur();    
  });

  right.addEventListener('click', () => {
    state.targetScroll.x += 500;

    showLeftButton();

    (document.activeElement as HTMLButtonElement).blur();    
  });

  hideLeftButton();

  return root;
}