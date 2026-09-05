import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The showcase's own tests import the kit the way the showcase does, by package name.
  resolve: {
    alias: { 'golem-ui': resolve(import.meta.dirname, 'src/index.ts') },
  },
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/bundle.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
      cssFileName: 'golem-ui',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'zod'],
    },
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'showcase/**/*.test.{ts,tsx}'],
  },
})
