'use strict';

/**
 * Gera automaticamente o pacote autocontido de produção dentro de `dist/` para deploy
 * direto no cPanel / Phusion Passenger (SuperDomínios):
 *  - Copia `app.js` para `dist/app.js`
 *  - Gera `dist/package.json` com `dependencies: {}`, pois `dist/server.cjs` já embute
 *    100% das dependências de runtime (`express`, `@google/genai`, `cheerio/slim`,
 *    `dotenv`, `winston`) — dispensando `Run NPM Install` e `node_modules` no cPanel.
 */

const fs = require('node:fs');
const path = require('node:path');

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const rootPkgPath = path.join(rootDir, 'package.json');
const rootAppJsPath = path.join(rootDir, 'app.js');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));

const cpanelPkg = {
  name: 'siteanalyzer-cpanel',
  private: true,
  version: rootPkg.version || '2.0.0',
  main: 'app.js',
  engines: {
    node: '>=20.0.0',
  },
  scripts: {
    start: 'node app.js',
  },
  dependencies: {},
};

fs.writeFileSync(
  path.join(distDir, 'package.json'),
  JSON.stringify(cpanelPkg, null, 2) + '\n',
  'utf8'
);

if (fs.existsSync(rootAppJsPath)) {
  fs.copyFileSync(rootAppJsPath, path.join(distDir, 'app.js'));
}

console.log('[prepare-cpanel] dist/package.json (zero-deps standalone) e dist/app.js gerados com sucesso.');
