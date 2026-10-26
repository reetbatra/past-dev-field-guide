/** Customer installs must not depend on framework tests or a deployment provider. */
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const typescript = JSON.parse(readFileSync(new URL('../../tsconfig.json', import.meta.url), 'utf8'));

test('default project omits provider and internal test packages', () => {
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
  for (const name of ['@thallylabs/cli', 'wrangler', '@opennextjs/cloudflare', 'vitest', 'vite', 'vite-tsconfig-paths', 'happy-dom']) {
    assert.equal(dependencies[name], undefined, name);
  }
  assert.equal(manifest.scripts.check, 'npx --yes --package=@thallylabs/cli@latest thally check');
  assert.equal(manifest.scripts['starter:update'], 'npx --yes --package=@thallylabs/cli@latest thally starter update');
  assert.ok(manifest.dependencies['@mdx-js/mdx'], 'runtime generator imports mdx directly');
  assert.match(manifest.scripts['setup:cloudflare'], /--save-exact @opennextjs\/cloudflare@\d+\.\d+\.\d+ wrangler@\d+\.\d+\.\d+$/);
  assert.ok(manifest.scripts['build:cloudflare'], 'managed build entrypoint must remain available');
});

test('production type checking excludes optional tooling and internal suites', () => {
  for (const path of ['**/__tests__/**', '**/*.test.*', '**/*.spec.*', 'src/test/**', 'open-next.config.ts']) {
    assert.ok(typescript.exclude.includes(path), path);
  }
});

test('Next config starts without a provider and surfaces broken installed providers', () => {
  const require = createRequire(import.meta.url);
  const loader = require.resolve('next/dist/server/config.js');
  const fixture = mkdtempSync(join(tmpdir(), 'thally-optional-provider-'));
  try {
    copyFileSync(new URL('../../next.config.ts', import.meta.url), join(fixture, 'next.config.ts'));
    writeFileSync(join(fixture, 'docs.json'), '{}');
    writeFileSync(join(fixture, 'package.json'), '{}');
    const script = `require(${JSON.stringify(loader)}).default('phase-development-server', process.cwd()).then(() => console.log('CONFIG_READY')).catch(error => { console.error(error); process.exitCode = 1; })`;
    const run = () => spawnSync(process.execPath, ['-e', script], { cwd: fixture, encoding: 'utf8', timeout: 30000 });
    const lean = run();
    assert.equal(lean.status, 0, lean.stderr);
    assert.match(lean.stdout, /CONFIG_READY/);
    const provider = join(fixture, 'node_modules/@opennextjs/cloudflare');
    mkdirSync(provider, { recursive: true });
    writeFileSync(join(provider, 'package.json'), '{"name":"@opennextjs/cloudflare","main":"index.js"}');
    writeFileSync(join(provider, 'index.js'), 'throw new Error("BROKEN_PROVIDER");');
    const broken = run();
    assert.equal(broken.status, 1);
    assert.match(broken.stderr, /BROKEN_PROVIDER/);
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});
