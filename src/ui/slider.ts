import { clamp } from '../utilities';
import { createTemplate, createWidget } from './create-widget';
import './slider.scss';

interface SliderConfig {
  label: string
  onChange: (value: number) => void
}

export function createSlider(config: SliderConfig) {
  let dragging = false;
  let centerOffsetX: number;

  const { root, bar, fill, knob } = createTemplate(`
    <div class="slider">
      <div class="slider--label">
        ${config.label}
      </div>
      <div @bar class="slider--bar"></div>
      <div @fill class="slider--bar-fill"></div>
      <div @knob class="slider--knob"></div>
    </div>  
  `);

  knob.addEventListener('mousedown', e => {
    const knobBounds = knob.getBoundingClientRect();
    
    dragging = true;
    centerOffsetX = e.clientX - (knobBounds.left + knobBounds.width / 2);
  });

  document.addEventListener('mousemove', e => {
    if (dragging) {
      const barBounds = bar.getBoundingClientRect();
      const knobBounds = knob.getBoundingClientRect();
      const min = 0;
      const max = barBounds.width - knobBounds.width;
      const knobX = clamp(e.clientX - barBounds.left - centerOffsetX - knobBounds.width / 2, min, max);
      const value = knobX / (barBounds.width - knobBounds.width);

      fill.style.width = `${value * 100}%`;
      knob.style.transform = `translateX(${knobX}px) translateY(-14px)`;

      config.onChange(value);
    }
  });

  document.addEventListener('mouseup', () => dragging = false);

  return root;
}