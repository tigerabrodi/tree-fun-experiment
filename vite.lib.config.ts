import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  assetsInclude: ['**/*.ktx2'],
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, './src') + '/',
      'three/webgpu': 'three/src/Three.WebGPU.js',
      'three/tsl': 'three/src/Three.TSL.js',
    },
  },
  build: {
    assetsInlineLimit: 0,
    lib: {
      entry: path.resolve(__dirname, 'src/lib/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    outDir: 'dist-lib',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      external: [/^three(\/.*)?$/],
    },
  },
})
