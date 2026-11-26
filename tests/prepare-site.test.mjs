import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

test('A09: deployment preparation emits parseable routes and preserves the supplied project identity', t => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'findback-prepare-'));
  t.after(() => {
    const target = path.resolve(fixture);
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
    assert.ok(path.basename(target).startsWith('findback-prepare-'));
    fs.rmSync(target, { recursive: true, force: true });
  });
  for (const dir of ['scripts', 'frontend/images', 'backend', 'site/.openai']) fs.mkdirSync(path.join(fixture, dir), { recursive: true });
  fs.copyFileSync(new URL('../scripts/prepare-site.mjs', import.meta.url), path.join(fixture, 'scripts/prepare-site.mjs'));
  for (const file of ['index.html', 'style.css', 'app.js', 'favicon.svg']) fs.writeFileSync(path.join(fixture, 'frontend', file), `fixture ${file}\n`);
  fs.writeFileSync(path.join(fixture, 'frontend/images/item.jpg'), 'fixture-image');
  fs.writeFileSync(path.join(fixture, 'backend/service.mjs'), 'export function handleApi() {}\n');
  fs.writeFileSync(path.join(fixture, 'site/.openai/hosting.json'), JSON.stringify({ project_id: 'fixture-only-not-a-real-site', keep: 'preserved' }));
  execFileSync(process.execPath, ['scripts/prepare-site.mjs'], { cwd: fixture, stdio: 'pipe' });
  const route = path.join(fixture, 'site/app/api/[[...path]]/route.ts');
  const generated = fs.readFileSync(route, 'utf8');
  assert.ok(generated.includes('\nexport function GET'), 'Generated code must contain actual line breaks');
  assert.ok(!generated.includes('\\n'), 'Literal backslash-n must not escape into the TypeScript source');
  const syntax = spawnSync(process.execPath, ['--check', route], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, syntax.stderr);
  for (const name of ['page.tsx', 'layout.tsx']) assert.ok(!fs.readFileSync(path.join(fixture, 'site/app', name), 'utf8').includes('\\n'));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(fixture, 'site/.openai/hosting.json'), 'utf8')), { project_id: 'fixture-only-not-a-real-site', keep: 'preserved', d1: 'DB' });
  assert.equal(fs.readFileSync(path.join(fixture, 'site/lib/service.mjs'), 'utf8'), fs.readFileSync(path.join(fixture, 'backend/service.mjs'), 'utf8'));
});
