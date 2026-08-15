import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relatif — player harus bisa di-host di path mana pun dan disematkan lintas-origin.
  base: './',
  server: { port: 5173 },
  build: {
    target: 'es2022',
    // Anggaran bundle ditegakkan di sini. Lihat docs/02-ARCHITECTURE.md §5.4.
    chunkSizeWarningLimit: 150,
  },
});
