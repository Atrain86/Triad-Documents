import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'design': path.resolve(__dirname, '../design/components'),
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173
  },
  publicDir: path.resolve(__dirname, 'public'),
  base: '/'
});
