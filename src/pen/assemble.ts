// Pure string assembly for the CodePen export. Shared by the in-app export
// buttons (browser) and the Vite plugin's build output (Node).
import type { ClockConfig } from '../clock.config.ts';

export const PEN_TITLE = 'Acoustic Horizon Clock';
export const PEN_DESCRIPTION =
  'Westworld-inspired acoustic ripple clock. Tweak CLOCK_CONFIG at the top of the JS panel. Made in the Ripple Clock lab.';

/** The four CodePen panels/fields the export fills in. */
export interface PenParts {
  html: string;
  css: string;
  js: string;
  head: string;
}

/** Puts the config block on top of the bundled engine, so it is the first thing you see in the JS panel. */
export function composePenJs(engine: string, config: ClockConfig): string {
  // A frozen clock in a pen just looks broken
  const exported: ClockConfig = { ...config, params: { ...config.params, isPaused: false } };
  return `// ${PEN_TITLE}
// Made in the Ripple Clock lab: https://github.com/dodopus/ripple-clock
//
// CLOCK_CONFIG is the whole look. Tweak values here, or dial a look in the lab
// and paste its "Copy config" output over this object.
const CLOCK_CONFIG = ${JSON.stringify(exported, null, 2)};

// ─────────────── clock engine · no need to edit below this line ───────────────

${engine}`;
}

/** A single self-contained HTML file equivalent to the pen. */
export function standaloneHtml({ html, css, js, head }: PenParts): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${PEN_TITLE}</title>
${head}
<style>
${css}
</style>
</head>
<body>
${html}
<script type="module">
${js.replace(/<\/script/gi, '<\\/script')}
</script>
</body>
</html>
`;
}
