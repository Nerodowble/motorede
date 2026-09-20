import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';
import {livekitTokenPlugin} from './vite/livekit-token-plugin';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Emite tokens do LiveKit durante o desenvolvimento. Em produção esse
      // papel vai para uma Supabase Edge Function.
      livekitTokenPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png'],
        manifest: {
          id: '/',
          name: 'MotoRede - Plataforma para Motociclistas',
          short_name: 'MotoRede',
          description: 'Plataforma PWA colaborativa para motociclistas: comboio por voz em tempo real, SOS geolocalizado, manutenção preditiva e cupons de oficinas.',
          theme_color: '#020617',
          background_color: '#0b0f19',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          // Puxa o tratamento de push para dentro do service worker gerado.
          // `importScripts` em vez de trocar para `injectManifest` porque a
          // única coisa que falta é o `push` — não vale reescrever a geração
          // inteira do Workbox por dois ouvintes de evento.
          importScripts: ['/push-sw.js'],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
