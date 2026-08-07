#!/usr/bin/env node
/**
 * SIGEHU — Empaquetado del backend para Node SEA (Single Executable Application).
 *
 * Pipeline (única implementación soportada):
 *
 *   ESM (src/*.js)
 *      │  esbuild
 *      ▼
 *   CommonJS (build/sea-bundle.cjs)
 *      │  node --experimental-sea-config (sea-config.json) + postject
 *      ▼
 *   sigehu-back.exe
 *
 * El blob del SEA solo puede contener un único archivo CommonJS autocontenido.
 * esbuild NO puede empaquetar:
 *   - Módulos nativos (.node):   bcrypt, node-firebird-native-api, etc.
 *   - Paquetes ESM que usan `import.meta.url` en runtime (node-cron, ...).
 *
 * Por eso todo paquete de `node_modules` se resuelve como módulo externo y se
 * carga en tiempo de ejecución desde `<directorio del ejecutable>/node_modules`
 * mediante `createRequire(process.execPath)`. build.bat / electron-builder son
 * los encargados de copiar ese node_modules junto al ejecutable.
 */
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Módulos builtin de Node.js (no se tocan; esbuild los deja como `require`).
const BUILTIN_MODULES = [
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain',
  'events', 'fs', 'http', 'http2', 'https', 'inspector', 'module', 'net',
  'os', 'path', 'perf_hooks', 'process', 'punycode', 'querystring', 'readline',
  'repl', 'stream', 'string_decoder', 'sys', 'timers', 'tls', 'trace_events',
  'tty', 'url', 'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib',
];

// Intercepta toda importación de paquete de node_modules (specifier sin '.'),
// excluyendo builtins (`node:...`) y paths relativos/absolutos.
const externalNodeModulesPlugin = {
  name: 'sigehu-external-node-modules',
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      // El entry point y los paths relativos/absolutos se empaquetan.
      if (args.kind === 'entry-point') return null;
      const p = args.path;
      const esRelativo = p.startsWith('.');
      const esAbsoluto = p.startsWith('/') || p.startsWith('\\') || /^[a-zA-Z]:[\\/]/.test(p);
      const esBuiltin = p.startsWith('node:') || BUILTIN_MODULES.includes(p.split('/')[0]);
      if (esRelativo || esAbsoluto || esBuiltin) return null;
      return { path: p, namespace: 'sigehu-external' };
    });

    // Cada paquete se carga con un `require` real anclado al ejecutable del SEA.
    build.onLoad({ filter: /.*/, namespace: 'sigehu-external' }, (args) => ({
      contents: [
        '"use strict";',
        "const { createRequire } = require('node:module');",
        `module.exports = createRequire(process.execPath)(${JSON.stringify(args.path)});`,
      ].join('\n'),
      loader: 'js',
    }));
  },
};

mkdirSync(join(__dirname, 'build'), { recursive: true });

await build({
  entryPoints: [join(__dirname, 'src', 'app.js')],
  outfile: join(__dirname, 'build', 'sea-bundle.cjs'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: ['node20'],
  plugins: [externalNodeModulesPlugin],
  legalComments: 'none',
  logLevel: 'info',
});

console.log('[build-sea] bundle CJS generado en build/sea-bundle.cjs');
