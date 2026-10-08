import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const FULL_SUPABASE_URL = 'https://psnoqlfyugqoolrzudqx.supabase.co';
const FULL_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzbm9xbGZ5dWdxb29scnp1ZHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MjU0MzIsImV4cCI6MjEwNzAwMTQzMn0.As2l_h5oxSmKxuDMyK-hTkv7Fg58mKKnO0XLD94r7rU';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(FULL_SUPABASE_URL),
      'import.meta.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(FULL_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(FULL_SUPABASE_ANON_KEY),
      'import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(FULL_SUPABASE_ANON_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
