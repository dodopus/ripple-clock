// Builds the CodePen version of the clock from the same source as the lab.
//
// Exposes `virtual:codepen-pen` (engine JS, CSS, head and HTML) to the app so the
// settings drawer can export the live config, and on `vite build` also writes a
// ready-to-paste pen with the default config to dist/codepen/.
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';
import { compile, optimize } from '@tailwindcss/node';
import { Scanner } from '@tailwindcss/oxide';
import type { Plugin } from 'vite';
import { composePenJs, standaloneHtml, type PenParts } from '../src/pen/assemble.ts';
import type { ClockConfig } from '../src/clock.config.ts';

const VIRTUAL_ID = 'virtual:codepen-pen';
const RESOLVED_ID = '\0' + VIRTUAL_ID;
const CDN = 'https://esm.sh';

const PEN_HTML = '<div id="root"></div>';
const PEN_HEAD =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=JetBrains+Mono:wght@200;300;400;500;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">';

type Built = { engine: string; css: string; inputs: Set<string> };

const installedVersion = (root: string, pkg: string): string =>
  JSON.parse(fs.readFileSync(path.join(root, 'node_modules', pkg, 'package.json'), 'utf8')).version;

/** Bundles src/pen/entry.tsx into readable ESM, loading npm packages from esm.sh at the installed versions. */
async function buildEngine(root: string) {
  const react = installedVersion(root, 'react');
  const cdnUrls: Record<string, string> = {
    react: `${CDN}/react@${react}`,
    'react/jsx-runtime': `${CDN}/react@${react}/jsx-runtime`,
    'react-dom/client': `${CDN}/react-dom@${installedVersion(root, 'react-dom')}/client?deps=react@${react}`,
    flubber: `${CDN}/flubber@${installedVersion(root, 'flubber')}`,
  };

  const result = await esbuild.build({
    absWorkingDir: root,
    entryPoints: ['src/pen/entry.tsx'],
    bundle: true,
    write: false,
    metafile: true,
    format: 'esm',
    target: 'es2022',
    jsx: 'automatic',
    charset: 'utf8',
    legalComments: 'none',
    plugins: [
      {
        name: 'esm-cdn',
        setup(build) {
          build.onResolve({ filter: /^[^./]/ }, ({ path: spec }) =>
            cdnUrls[spec]
              ? { path: cdnUrls[spec], external: true }
              : { errors: [{ text: `No CDN URL for "${spec}": add it to cdnUrls in codepen/vite-plugin.ts` }] },
          );
        },
      },
    ],
  });

  return {
    code: result.outputFiles[0].text.trim(),
    inputs: Object.keys(result.metafile.inputs).map((f) => path.resolve(root, f)),
  };
}

/** Compiles src/pen/pen.css with only the utilities the bare clock uses. */
async function buildCss(root: string) {
  const file = path.join(root, 'src/pen/pen.css');
  const inputs = [file];
  const compiler = await compile(fs.readFileSync(file, 'utf8'), {
    base: path.dirname(file),
    from: file,
    onDependency: (dep) => inputs.push(dep),
  });
  const scanner = new Scanner({ sources: compiler.sources });
  const css = optimize(compiler.build(scanner.scan()), { file }).code;
  return { code: css.trim(), inputs: [...inputs, ...scanner.files] };
}

export function codepenPen(): Plugin {
  let root = process.cwd();
  let cached: Promise<Built> | null = null;

  const build = () =>
    (cached ??= Promise.all([buildEngine(root), buildCss(root)]).then(([js, css]) => ({
      engine: js.code,
      css: css.code,
      inputs: new Set([...js.inputs, ...css.inputs].map((f) => path.normalize(f))),
    })));

  return {
    name: 'codepen-pen',

    configResolved(config) {
      root = config.root;
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },

    async load(id) {
      if (id !== RESOLVED_ID) return;
      const { engine, css, inputs } = await build();
      inputs.forEach((f) => this.addWatchFile(f));
      return [
        `export const penEngine = ${JSON.stringify(engine)};`,
        `export const penCss = ${JSON.stringify(css)};`,
        `export const penHead = ${JSON.stringify(PEN_HEAD)};`,
        `export const penHtml = ${JSON.stringify(PEN_HTML)};`,
      ].join('\n');
    },

    // Rebuild the pen when any file it is made from changes in dev
    async handleHotUpdate({ file, server }) {
      if (!cached || !(await cached).inputs.has(path.normalize(file))) return;
      cached = null;
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) server.moduleGraph.invalidateModule(mod);
    },

    async generateBundle() {
      const { engine, css } = await build();
      const defaultConfig: ClockConfig = JSON.parse(fs.readFileSync(path.join(root, 'src/clock.config.json'), 'utf8'));
      const parts: PenParts = { html: PEN_HTML, css, head: PEN_HEAD, js: composePenJs(engine, defaultConfig) };
      const files: Record<string, string> = {
        'codepen/pen.html': parts.html + '\n',
        'codepen/pen.css': parts.css + '\n',
        'codepen/pen.js': parts.js + '\n',
        'codepen/head.html': parts.head + '\n',
        'codepen/index.html': standaloneHtml(parts),
      };
      for (const [fileName, source] of Object.entries(files)) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
  };
}
