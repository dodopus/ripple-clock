import { serializeConfig, type ClockConfig } from '../clock.config';
import { PEN_DESCRIPTION, PEN_TITLE, composePenJs, standaloneHtml, type PenParts } from './assemble';

/** Builds the pen for a config. The engine is lazy-loaded so it stays out of the lab's main bundle. */
export async function buildPen(config: ClockConfig): Promise<PenParts> {
  const { penEngine, penCss, penHead, penHtml } = await import('virtual:codepen-pen');
  return { html: penHtml, css: penCss, head: penHead, js: composePenJs(penEngine, config) };
}

/** Opens a new, pre-filled pen via CodePen's prefill API (a form POST to /pen/define). */
export function openInCodePen(pen: PenParts) {
  const form = document.createElement('form');
  form.action = 'https://codepen.io/pen/define';
  form.method = 'POST';
  form.target = '_blank';

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'data';
  input.value = JSON.stringify({
    title: PEN_TITLE,
    description: PEN_DESCRIPTION,
    tags: ['clock', 'canvas', 'react', 'westworld'],
    editors: '001', // open the JS panel, where CLOCK_CONFIG lives
    layout: 'left',
    ...pen,
  });

  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
  form.remove();
}

export const copyConfig = (config: ClockConfig) => navigator.clipboard.writeText(serializeConfig(config));

export function downloadStandaloneHtml(pen: PenParts) {
  const url = URL.createObjectURL(new Blob([standaloneHtml(pen)], { type: 'text/html' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ripple-clock.html';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
