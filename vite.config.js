import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Automatically updates the app when you push to Vercel
      includeAssets: ['letterLogo.png', 'wordLogo.png'], // Caches your logos for offline use
      manifest: {
        name: 'aKwarts',
        short_name: 'aKwarts',
        description: 'Personal Expense & Income Tracker',
        theme_color: '#4e1a3d',
        background_color: '#f2f2f7',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'letterLogo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'letterLogo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'] // Tells the service worker to cache all these file types
      }
    })
  ]
});