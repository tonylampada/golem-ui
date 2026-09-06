import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const root = import.meta.dirname

export default defineConfig({
  root,
  // The Pages root. Storybook and the showcase are folders underneath it.
  base: '/golem-ui/',
  plugins: [tailwindcss()],
  build: {
    // The whole Pages artifact. This build runs first and clears it; `build-storybook` and
    // `build-showcase` then write their own subfolders into it.
    outDir: resolve(root, '../dist-site'),
    emptyOutDir: true,
  },
})
