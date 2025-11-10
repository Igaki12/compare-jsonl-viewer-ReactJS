import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/compare-jsonl-viewer-ReactJS/' : '/',
  plugins: [react()],
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  },
}))
