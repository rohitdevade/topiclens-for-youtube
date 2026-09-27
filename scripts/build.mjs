import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await import('./generate-icons.mjs');
await mkdir('dist', { recursive: true });
await mkdir('dist/icons', { recursive: true });
await build({ entryPoints: ['src/content.ts', 'src/background.ts', 'src/popup.ts', 'src/options.ts'], outdir: 'dist', bundle: true, target: 'chrome120', format: 'iife' });
for (const file of ['manifest.json', 'popup.html', 'popup.css', 'content.css', 'options.html', 'options.css']) await copyFile(`public/${file}`, `dist/${file}`);
for (const size of [16, 32, 48, 128]) await copyFile(`public/icons/icon${size}.png`, `dist/icons/icon${size}.png`);
