import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Your shared .env is one folder above frontend
  envDir: '../',

  server: {
    host: true,

    // Let HTTPS tunnels (used to test the PWA on a phone) reach the dev server.
    allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok-free.dev', '.ngrok.io'],

    // During development:
    // /api/... -> FastAPI running on localhost:8000
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: 'autoUpdate',

      // Serve the manifest + service worker from `npm run dev` too.
      // Without this, the dev server has no service worker, so Android
      // never offers "Install app".
      devOptions: {
        enabled: true,
      },

      manifest: {
        name: 'Doomscroll & Dine',
        short_name: 'Doomscroll & Dine',
        description:
          'Turn saved TikTok/Instagram recipes into dinner plans with your friends.',

        start_url: '/',
        display: 'standalone',

        background_color: '#ffffff',
        theme_color: '#000000',

        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],

        // THIS is what allows Android to show
        // Doomscroll & Dine in the Share menu.
        share_target: {
          action: '/share',
          method: 'GET',
          enctype: 'application/x-www-form-urlencoded',

          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        },
      },
    }),
  ],
})