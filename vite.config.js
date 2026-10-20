import { defineConfig } from 'vite';

// base './' keeps every built URL relative, so the game runs from any sub-path (GitHub Pages: /Padel_Game/).
// The controls page, the privacy page and the gamepad test page are extra entries so they ship too.
export default defineConfig({
  base: './',
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },   // names the service worker's cache: a new deploy drops the old one
  build: { rollupOptions: { input: { main: 'index.html', controls: 'kontroller.html', privacy: 'privacy.html', padtest: 'tools/padtest.html' } } },
});
