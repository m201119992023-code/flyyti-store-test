import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          // Fix: __dirname is not available in ESM environments. 
          // path.resolve('.') resolves to the project root directory during the Vite build process.
          '@': path.resolve('.'),
        }
      }
    };
});