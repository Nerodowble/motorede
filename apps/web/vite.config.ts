import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';
import {livekitTokenPlugin} from './vite/livekit-token-plugin';

/**
 * Versão do app nativo para a página /baixar/ mostrar ao lado do botão do
 * APK. Lida do `apps/mobile/app.json` no build para não haver um segundo
 * número para lembrar de atualizar. Se a leitura falhar, a página omite a
 * versão em vez de quebrar o build da web.
 */
function versaoDoAppNativo(): string | null {
  try {
    const appJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../mobile/app.json'), 'utf8'));
    return typeof appJson?.expo?.version === 'string' ? appJson.expo.version : null;
  } catch {
    return null;
  }
}

/**
 * O vite-plugin-pwa injeta o `<link rel="manifest">` e o registro do service
 * worker em TODAS as páginas HTML do build. Na landing isso faria o Chrome
 * oferecer "instalar" a própria landing, e quem aceitasse ficaria com um
 * ícone que abre a página de download em vez do app. Este plugin roda depois
 * dele e tira as duas tags só de /baixar/.
 */
function landingSemPWA(): Plugin {
  return {
    name: 'motorede:landing-sem-pwa',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.path.startsWith('/baixar/')) return html;
        return html
          .replace(/<link rel="manifest"[^>]*>/g, '')
          .replace(/<script id="vite-plugin-pwa:register-sw"[^>]*><\/script>/g, '');
      },
    },
  };
}

export default defineConfig(() => {
  return {
    define: {
      __MOTOREDE_VERSAO_APP__: JSON.stringify(versaoDoAppNativo()),
    },
    build: {
      rollupOptions: {
        // Duas páginas no mesmo deploy: o app em `/` e a página de
        // divulgação em `/baixar/` (código em src/landing/).
        input: {
          main: path.resolve(__dirname, 'index.html'),
          baixar: path.resolve(__dirname, 'baixar/index.html'),
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      // Emite tokens do LiveKit durante o desenvolvimento. Em produção esse
      // papel é da função serverless `api/livekit-token.ts`, na Vercel.
      livekitTokenPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        // Ícones gerados por scripts/gerar-marca.ps1 a partir de docs/marca/.
        includeAssets: ['favicon-32.png', 'favicon-64.png', 'apple-touch-icon.png', 'marca-pino.png', 'marca-logo.png'],
        manifest: {
          id: '/',
          name: 'MotoRede - Plataforma para Motociclistas',
          short_name: 'MotoRede',
          description: 'Plataforma PWA colaborativa para motociclistas: comboio por voz em tempo real, SOS geolocalizado, manutenção preditiva e cupons de oficinas.',
          theme_color: '#0a0a0b',
          background_color: '#0a0a0b',
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
          // O service worker do app responde toda navegação com o index.html
          // do app (fallback de SPA). Sem esta exclusão, quem já usou o app e
          // abre o link de /baixar receberia o app em vez da página de
          // download.
          navigateFallbackDenylist: [/^\/baixar/],
        },
        devOptions: {
          enabled: false,
        },
      }),
      // Depois do VitePWA, para encontrar as tags que ele injetou.
      landingSemPWA(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
