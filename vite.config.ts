import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { codepenPen } from './codepen/vite-plugin.ts';

export default defineConfig({
  plugins: [react(), tailwindcss(), codepenPen()],
  resolve: {
    alias: {
      '@': import.meta.dirname,
    },
  },
});
