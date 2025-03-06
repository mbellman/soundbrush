import { createChannelPanel } from './channel-panel';
import { createTemplate } from './create-widget';
import { ChannelConfig } from '../Sequence';
import './channel-manager.scss';

interface ChannelManagerConfig {
  onChannelPanelAdded: (element: HTMLElement) => void
  onChangeChannelName: (name: string) => void
  onChangeChannelConfig: (config: Partial<ChannelConfig>) => void
  onChannelPanelSelected: (element: HTMLElement) => void
}

export function createChannelManager({
  onChannelPanelAdded,
  onChangeChannelName,
  onChangeChannelConfig,
  onChannelPanelSelected
}: ChannelManagerConfig) {
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

    onChannelPanelSelected(element);
  }

  function addNewChannel() {
    const panel = createChannelPanel({
      name: 'Channel ...',
      onExpand: expandChannel,
      onChangeChannelName,
      onChangeChannelConfig
    });

    list.appendChild(panel);
  
    onChannelPanelAdded(panel);
  }

  addButton.addEventListener('click', () => {
    collapseAllChannels();
    addNewChannel();
  });

  document.body.appendChild(root);

  addNewChannel();

  return root;
}