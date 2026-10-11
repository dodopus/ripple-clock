import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { codepenPen } from './codepen/vite-plugin.ts';

/** `--mode single`: inline all JS and CSS into index.html so the lab is one file you can open anywhere. */
function inlineIntoHtml(): Plugin {
  return {
    name: 'inline-into-html',
    enforce: 'post',
    generateBundle(_, bundle) {
      const html = Object.values(bundle).find((f) => f.fileName === 'index.html');
      if (!html || html.type !== 'asset') return;
      let source = String(html.source);
      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk' && file.isEntry) {
          const code = file.code
            // Vite leaves its preload placeholder unfilled when dynamic imports are inlined; nothing to preload here
            .replaceAll('__VITE_PRELOAD__', 'void 0')
            .replace(/<\/script/gi, '<\\/script');
          source = source.replace(new RegExp(`<script type="module" crossorigin src="[^"]*${file.fileName}"></script>`), () => `<script type="module">\n${code}\n</script>`);
          delete bundle[file.fileName];
        } else if (file.type === 'asset' && file.fileName.endsWith('.css')) {
          source = source.replace(new RegExp(`<link rel="stylesheet" crossorigin href="[^"]*${file.fileName}">`), () => `<style>\n${file.source}\n</style>`);
          delete bundle[file.fileName];
        }
      }
      html.source = source;
    },
  };
}

export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    plugins: [react(), tailwindcss(), codepenPen(), single && inlineIntoHtml()],
    resolve: {
      alias: {
        '@': import.meta.dirname,
      },
    },
    build: single
      ? { outDir: 'dist-single', rollupOptions: { output: { inlineDynamicImports: true } } }
      : undefined,
  };
});
