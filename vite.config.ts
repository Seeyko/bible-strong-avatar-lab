import path from 'node:path'
import { fileURLToPath } from 'node:url'

import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root,
  base: './',
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  resolve: {
    alias: {
      '@': path.join(root, 'src'),
    },
  },
  build: {
    outDir: path.join(root, 'dist'),
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        main: path.join(root, 'index.html'),
        grokCompare: path.join(root, 'grok-compare/index.html'),
        captureLab: path.join(root, 'capture-lab/index.html'),
      },
    },
  },
})
