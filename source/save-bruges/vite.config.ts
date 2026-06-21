import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: path.resolve(__dirname, '../../games/SaveBruge'),
    emptyOutDir: false,
  },
});
