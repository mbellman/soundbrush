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

/**
 * @internal
 */
function createPanButtons() {
  const container = document.createElement('div');

  container.classList.add('pan-buttons');

  container.innerHTML = `
    <button class="pan-button left">«</button>
    <button class="pan-button right">»</button>
  `;

  return container;
}

export function createUi(state: State, settings: Settings): void {
  const panButtons = createPanButtons();

  on.click(panButtons, '.pan-button.left', () => {
    state.targetScroll.x = Math.max(0, state.targetScroll.x - 500);

    (document.activeElement as HTMLButtonElement).blur();
  });

  on.click(panButtons, '.pan-button.right', () => {
    state.targetScroll.x += 500;

    (document.activeElement as HTMLButtonElement).blur();
  });

  document.body.appendChild(panButtons);
}