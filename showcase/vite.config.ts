import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const root = import.meta.dirname

export default defineConfig({
  root,
  // The showcase is published under the Storybook site, at /golem-ui/app/.
  base: '/golem-ui/app/',
  plugins: [react(), tailwindcss()],
  resolve: {
    // Resolved to the workspace source, not to the npm package: a component shows up here the
    // moment it lands in src/, with no build and no version skew.
    alias: { 'golem-ui': resolve(root, '../src/index.ts') },
  },
  build: {
    // Straight into the Pages artifact Storybook produced, so CI uploads one directory.
    outDir: resolve(root, '../storybook-static/app'),
    emptyOutDir: true,
  },
})
