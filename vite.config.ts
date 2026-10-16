import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon.png',
        'apple-touch-icon.png',
        'icon-512.png',
        'icon.svg',
        'audio/*.mp3',
        'lyrics/*.txt'
      ],
      manifest: {
        name: '應援音控面板 Audio Panel (M3)',
        short_name: '音控面板',
        description: 'Material Design 3 淡藍色主題 Android 行動端音檔控場與多版本動態調配系統',
        theme_color: '#f4f9ff',
        background_color: '#f4f9ff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        icons: [
          {
            src: 'favicon.png',
            sizes: '256x256',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,mp3,txt}']
      }
    })
  ]
});
