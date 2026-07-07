#!/usr/bin/env node
'use strict';
/**
 * bytecode.js — VENDOR build step (Layer 2): compile the assembled application
 * tree to V8 bytecode (.jsc) so the shipped appliance carries NO readable source.
 *
 *   node tools/build/bytecode.js <appSrcDir> <outDir>
 *
 * Every .js under <appSrcDir> (minus node_modules/tests/tools) is compiled to a
 * matching .jsc under <outDir>/app/, and an `app.jsc` entry is emitted that the
 * SEA launcher loads via bytenode. The bytecode is tied to the shipped Node/SEA
 * runtime version — an intentional binding, not a limitation.
 *
 * bytenode installs a require(".jsc") hook, so at runtime the compiled modules
 * resolve their (also-compiled) siblings transparently.
 */
const fs = require('fs');
const path = require('path');
const bytenode = require('bytenode');

const SKIP_DIRS = new Set(['node_modules', 'tests', 'test', 'tools', 'dist-obf', 'dist-appliance', '.git', 'coverage', 'logs']);

function walk(dir, base, files) {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = path.relative(base, abs);
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(abs, base, files);
    } else if (name.endsWith('.js') && !name.endsWith('.test.js')) {
      files.push(rel);
    }
  }
  return files;
}

function main() {
  const appSrc = path.resolve(process.argv[2] || '.');
  const outDir = path.resolve(process.argv[3] || path.join(appSrc, '..', 'dist-appliance'));
  const appOut = path.join(outDir, 'app');
  fs.mkdirSync(appOut, { recursive: true });

  const files = walk(appSrc, appSrc, []);
  let compiled = 0;
  for (const rel of files) {
    const src = path.join(appSrc, rel);
    const dest = path.join(appOut, rel.replace(/\.js$/, '.jsc'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    bytenode.compileFile({ filename: src, output: dest, compileAsModule: true });
    compiled++;
  }

  // Emit the entry shim the launcher loads. It register bytenode then requires the
  // compiled index — sibling .jsc modules resolve through the same hook.
  const entry = path.join(outDir, 'app.jsc');
  const shimSrc = "'use strict';\nrequire('bytenode');\nmodule.exports = require(" +
    JSON.stringify(path.join(appOut, 'src', 'index.jsc')) + ");\n";
  // The entry itself is plain JS (it only wires bytenode); the app is bytecode.
  fs.writeFileSync(path.join(outDir, 'app.entry.js'), shimSrc);
  bytenode.compileFile({ filename: path.join(outDir, 'app.entry.js'), output: entry, compileAsModule: true });

  console.log(`Compiled ${compiled} module(s) to bytecode → ${appOut}`);
  console.log(`Entry: ${entry}`);
}

main();
