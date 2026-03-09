const { execFileSync } = require('node:child_process');
const { readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

const roots = ['api', 'lib', 'middleware', 'models', 'routes', 'utils'];
const files = ['server.js', 'vite.config.js'];

function collectJsFiles(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      collectJsFiles(fullPath);
      continue;
    }

    if (entry.endsWith('.js')) {
      files.push(fullPath);
    }
  }
}

for (const root of roots) {
  collectJsFiles(root);
}

const failures = [];
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    failures.push({ file, output: error.stderr?.toString() || error.message });
  }
}

if (failures.length) {
  for (const failure of failures) {
    process.stderr.write(`\nSyntax error in ${failure.file}:\n${failure.output}\n`);
  }
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} files.`);
