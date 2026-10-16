import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'audio/*.mp3', 'lyrics/*.txt'],
      manifest: {
        name: '應援音控面板 Audio Panel',
        short_name: '音控面板',
        description: 'Android 行動端極簡大按鈕音檔控場與多版本動態調配系統',
        theme_color: '#090d16',
        background_color: '#090d16',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,mp3,txt}']
      }
    })
  ]
});
