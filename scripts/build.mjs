import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { build } from 'esbuild';

const root = new URL('..', import.meta.url);
const distDir = join(root.pathname, 'dist');

const staticFiles = [
  ['src/popup/popup.html', 'popup.html'],
  ['src/popup/popup.css', 'popup.css']
];

mkdirSync(distDir, { recursive: true });

await Promise.all([
  build({
    entryPoints: [join(root.pathname, 'src/content/content.ts')],
    outfile: join(distDir, 'content.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'chrome114',
    logLevel: 'info'
  }),
  build({
    entryPoints: [join(root.pathname, 'src/popup/popup.ts')],
    outfile: join(distDir, 'popup.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'chrome114',
    logLevel: 'info'
  }),
  build({
    entryPoints: [join(root.pathname, 'src/background/background.ts')],
    outfile: join(distDir, 'background.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'chrome114',
    logLevel: 'info'
  })
]);

for (const [source, target] of staticFiles) {
  const sourcePath = join(root.pathname, source);
  const targetPath = join(distDir, target);
  if (existsSync(sourcePath)) {
    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(sourcePath, targetPath);
  }
}

const manifestPath = join(root.pathname, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.action.default_popup = 'popup.html';
manifest.background.service_worker = 'background.js';
manifest.content_scripts = manifest.content_scripts.map((script) => ({
  ...script,
  js: script.js.map((file) => file.replace(/^dist\//, ''))
}));
writeFileSync(join(distDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
