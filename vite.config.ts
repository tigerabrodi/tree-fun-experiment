import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, './src') + '/',
      'three/webgpu': 'three/src/Three.WebGPU.js',
      'three/tsl': 'three/src/Three.TSL.js',
    },
  },
})
