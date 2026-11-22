import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the build works on GitHub Pages (sub-path) or Vercel (root).
  base: './',
  define: {
    // A new value every time the dev server starts. In dev mode the game wipes saved progress
    // when this changes, so each `npm run dev` starts from scratch. Production ignores it.
    __DEV_SESSION__: JSON.stringify(String(Date.now())),
  },
});
