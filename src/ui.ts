import { Settings, State } from './types';
import './ui.scss';

/**
 * @todo move elsewhere
 */
function bind(container: HTMLElement, selector: string, event: string, handler: () => void): void {
  container.querySelector(selector).addEventListener(event, handler);
}

/**
 * @todo move elsewhere
 */
const on = {
  click: (container: HTMLElement, selector: string, handler: () => void) => {
    bind(container, selector, 'click', handler);
  }
};

export function createUi(state: State, settings: Settings): void {
  const ui = document.createElement('div');

  ui.innerHTML = `
    <div class="pan-buttons">
      <button class="pan-button left">«</button>
      <button class="pan-button right">»</button>
    </div>
  `;

  on.click(ui, '.pan-button.left', () => {
    state.targetScroll.x = Math.max(0, state.targetScroll.x - 500);

    (document.activeElement as HTMLButtonElement).blur();
  });

  on.click(ui, '.pan-button.right', () => {
    state.targetScroll.x += 500;

    (document.activeElement as HTMLButtonElement).blur();
  });

  document.body.appendChild(ui);
}