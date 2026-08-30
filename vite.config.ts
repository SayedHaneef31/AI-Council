import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

const copyAssetsPlugin = () => ({
  name: 'copy-assets-plugin',
  writeBundle() {
    // Copy manifest.json to dist/manifest.json
    fs.copyFileSync(
      resolve(__dirname, 'manifest.json'),
      resolve(__dirname, 'dist/manifest.json')
    );

    // Ensure dist/sidepanel directory exists and copy index.html
    const sidepanelDir = resolve(__dirname, 'dist/sidepanel');
    if (!fs.existsSync(sidepanelDir)) {
      fs.mkdirSync(sidepanelDir, { recursive: true });
    }

    const srcHtml = resolve(__dirname, 'dist/src/sidepanel/index.html');
    if (fs.existsSync(srcHtml)) {
      fs.copyFileSync(srcHtml, resolve(sidepanelDir, 'index.html'));
    }

    // Copy public/icons directory to dist/icons
    const publicIconsDir = resolve(__dirname, 'public/icons');
    const distIconsDir = resolve(__dirname, 'dist/icons');
    if (fs.existsSync(publicIconsDir)) {
      if (!fs.existsSync(distIconsDir)) {
        fs.mkdirSync(distIconsDir, { recursive: true });
      }
      const files = fs.readdirSync(publicIconsDir);
      for (const file of files) {
        fs.copyFileSync(resolve(publicIconsDir, file), resolve(distIconsDir, file));
      }
    }
  }
});

export default defineConfig({
  plugins: [react(), copyAssetsPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'content/chatgpt': resolve(__dirname, 'src/content/chatgpt/content.ts'),
        'content/claude': resolve(__dirname, 'src/content/claude/content.ts'),
        'content/gemini': resolve(__dirname, 'src/content/gemini/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
