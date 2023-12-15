import { clamp } from '../utilities';
import { createWidget } from './create-widget';
import './slider.scss';

interface SliderConfig {
  label: string
  onChange: (value: number) => void
}

export function createSlider(config: SliderConfig) {
  let dragging = false;
  let centerOffsetX: number;

  return createWidget('div', {
    template: `
      <div class="slider">
        <div class="slider--label">
          ${config.label}
        </div>
        <div @bar class="slider--bar"></div>
        <div @knob class="slider--knob"></div>
      </div>
    `,
    events: {
      mousedown: {
        '.slider--knob': (e, $) => {
          const knobBounds = $.knob.getBoundingClientRect();
    
          dragging = true;
          centerOffsetX = e.clientX - (knobBounds.left + knobBounds.width / 2);
        }
      },
      mousemove: {
        'document': (e, $) => {
          if (dragging) {
            const barBounds = $.bar.getBoundingClientRect();
            const knobBounds = $.knob.getBoundingClientRect();
            const min = 0;
            const max = barBounds.width - knobBounds.width;
            const knobX = clamp(e.clientX - barBounds.left - centerOffsetX - knobBounds.width / 2, min, max);
            const value = knobX / (barBounds.width - knobBounds.width);
      
            $.knob.style.transform = `translateX(${knobX}px) translateY(-11px)`;
      
            config.onChange(value);
          }
        }
      },
      mouseup: {
        'document': () => dragging = false
      }
    }
  });
}