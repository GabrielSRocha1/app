import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Solucionar referências não expandidas comuns
  const apiKey = (env.API_KEY?.startsWith('$') ? env.GEMINI_API_KEY : env.API_KEY) || env.GEMINI_API_KEY;

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.ELEVENLABS_API_KEY': JSON.stringify(env.ELEVENLABS_API_KEY),
      // Mantenha para não quebrar outros possíveis usos:
      'process.env': {}
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true
    }
  };
});