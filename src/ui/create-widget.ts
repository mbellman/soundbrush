type ElementMap = Record<string, HTMLElement>
type EventMap<E> = Record<string, (e: E, $: ElementMap) => void>

type Events = {
  click?: EventMap<MouseEvent>
  mousedown?: EventMap<MouseEvent>
  mousemove?: EventMap<MouseEvent>
  mouseup?: EventMap<MouseEvent>
}

interface WidgetConfig {
  template: string
  events?: Events
}

// @todo allow widgets to be 'destroyed' + unbind their event listeners
export function createWidget(tag: 'div', config: WidgetConfig): HTMLDivElement;
export function createWidget(tag: 'button', config: WidgetConfig): HTMLButtonElement;
export function createWidget(tag: string, config: WidgetConfig): HTMLElement {
  const root = document.createElement(tag);
  const elementMap: ElementMap = {};

  root.innerHTML = config.template
    .trim()
    .replace(
      /@[A-Za-z]+/g,
      name => `data-element="${name.slice(1)}"`
    );

  root.querySelectorAll('[data-element]').forEach(node => {
    const name = node.getAttribute('data-element');

    elementMap[name] = node as HTMLElement;
  });

  function bindEventsOfType(event: keyof Events) {
    const events = config.events?.[event] || {};

    for (const selector in events) {
      const listener = config.events[event][selector];

      if (selector === 'document') {
        document.addEventListener(event, e => listener(e, elementMap));
      } else {
        // @ts-ignore
        root.querySelector(selector).addEventListener(event, e => listener(e, elementMap));
      }
    }    
  }

  bindEventsOfType('click');
  bindEventsOfType('mousedown');
  bindEventsOfType('mousemove');
  bindEventsOfType('mouseup');

  return root.firstChild as HTMLElement;
}