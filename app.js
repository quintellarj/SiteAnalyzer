// Ponto de entrada principal para hospedagem cPanel / Phusion Passenger (SuperDomínios)
// Domínio de produção: https://siteanalyzer.s7vendesign.com.br
//
// Compatível com CloudLinux Phusion Passenger (CommonJS puro) e com ambos os
// formatos de deploy no cPanel:
//   1) Conteúdo de dist/ extraído na raiz: ./server.cjs + ./index.html
//   2) Estrutura completa:                 ./dist/server.cjs + ./dist/index.html

'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

// Garante ambiente de produção por padrão no cPanel se não estiver definido
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

function logBootError(err) {
  const details =
    err && err.stack
      ? String(err.stack)
      : err && err.message
        ? String(err.message)
        : String(err);
  const entry = `[${new Date().toISOString()}] BOOT ERROR:\n${details}\n\n`;
  console.error('[SiteAnalyzer][Passenger]', entry);
  try {
    fs.appendFileSync(path.join(__dirname, 'passenger-boot-error.log'), entry, 'utf8');
  } catch {
    // ignore filesystem write errors
  }
  return details;
}

function startDiagnosticFallbackServer(errorMessage) {
  const fallbackServer = http.createServer((req, res) => {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        status: 'boot_error',
        path: req.url,
        nodeVersion: process.version,
        error: errorMessage,
        hint: 'Verifique passenger-boot-error.log na pasta do aplicativo no cPanel.',
      })
    );
  });
  const rawPort = process.env.PORT;
  const target = rawPort && Number.isNaN(Number(rawPort)) ? rawPort : rawPort ? Number(rawPort) : 3000;
  fallbackServer.listen(target);
  return fallbackServer;
}

let exportedApp = null;

try {
  // Prioriza ./server.cjs na raiz para evitar que uma pasta dist/ antiga sobrescreva o deploy atual
  const candidatePaths = [
    path.join(__dirname, 'server.cjs'),
    path.join(__dirname, 'dist', 'server.cjs'),
  ];

  const serverPath = candidatePaths.find((p) => fs.existsSync(p));

  if (!serverPath) {
    throw new Error(
      `Arquivo server.cjs não encontrado em: ${candidatePaths.join(' ou ')}. ` +
        'Gere o build com "npm run build" e envie o conteúdo de dist/.'
    );
  }

  // Carrega o servidor unificado compilado pelo esbuild
  const serverModule = require(serverPath);

  // Suporta tanto export default (esbuild CJS interop) quanto module.exports direto
  exportedApp = serverModule && serverModule.default ? serverModule.default : serverModule;

  // Inicia o listener HTTP somente se ainda não estiver escutando (evita conflito de porta)
  if (typeof serverModule.startServer === 'function' && !global.__SITEANALYZER_STARTED__) {
    global.__SITEANALYZER_STARTED__ = true;
    serverModule.startServer().catch((err) => {
      logBootError(err);
    });
  }
} catch (bootErr) {
  const details = logBootError(bootErr);
  exportedApp = startDiagnosticFallbackServer(details);
}

module.exports = exportedApp;
