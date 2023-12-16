import { State } from '../types';
import { createChannelPanel } from './channel-panel';
import { createTemplate } from './create-widget';
import './channel-manager.scss';

export function createChannelManager(state: State) {
  const { root, list, addButton } = createTemplate(`
    <div class="channel-manager">
      <div @list></div>
      <button @addButton class="channel-manager--add-channel-button">
        +
      </button>
    </div>
  `);

  function collapseAllChannels() {
    root.querySelectorAll('.channel-panel').forEach(element => {
      element.classList.remove('expanded');
      element.classList.add('collapsed');
    });
  }

  function expandChannel(element: HTMLDivElement) {
    collapseAllChannels();

    element.classList.add('expanded');
    element.classList.remove('collapsed');
  }

  list.appendChild(createChannelPanel(state, {
    name: 'Channel ...',
    onExpand: expandChannel
  }));

  addButton.addEventListener('click', () => {
    collapseAllChannels();

    list.appendChild(createChannelPanel(state, {
      name: 'Channel ...',
      onExpand: expandChannel
    }));
  });

  document.body.appendChild(root);

  return root;
}