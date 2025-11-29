import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/flashcard-app/' : '/',
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 3000, // Default port
    strictPort: false, // Try next available port if 3000 is in use
    open: true, // Automatically open browser
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          motion: ['framer-motion'],
          router: ['react-router-dom'],
        },
      },
    },
  },
  // Suppress source map warnings in development
  logLevel: 'warn',
  // Ensure proper handling of static assets for GitHub Pages
  publicDir: 'public',
}));
