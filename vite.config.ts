/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    // L'editor degli scenari è una pagina a parte, non collegata al gioco.
    rollupOptions: { input: { main: 'index.html', editor: 'editor.html' } },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
