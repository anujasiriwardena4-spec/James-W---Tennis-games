#!/usr/bin/env node
/* Inlines styles.css and the four js/ files into a single self-contained
   standalone.html. Run from the repo root after changing any source file. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const html = read('index.html');
const css = read('styles.css');
const js = ['js/data.js', 'js/engine.js', 'js/game.js', 'js/ui.js'].map(f => {
  const s = read(f);
  const cut = s.indexOf("if (typeof module !== 'undefined')");   // node-only exports
  return (cut >= 0 ? s.slice(0, cut) : s).trimEnd();
}).join('\n\n');

// Ad markup only works on the real deployed site — the Claude Artifact
// preview's sandboxed CSP blocks every ad host outright, so it's stripped
// here rather than shipped as dead, always-failing script tags.
const stripAds = s => s.replace(/\s*<!-- ad:start -->[\s\S]*?<!-- ad:end -->/g, '');

const head = stripAds(html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>')))
  .replace(/\s*<link rel="stylesheet" href="styles\.css">/, '').trim();
const body = stripAds(html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')))
  .replace(/\s*<script src="js\/[a-z]+\.js"><\/script>/g, '').trim();

const page = '<!doctype html>\n<html lang="en">\n<head>\n' + head +
  '\n<style>\n' + css + '\n</style>\n</head>\n<body>\n' + body +
  '\n<script>\n' + js + '\n</' + 'script>\n</body>\n</html>\n';

fs.writeFileSync(path.join(root, 'standalone.html'), page);
console.log('standalone.html written —', page.length, 'bytes');
