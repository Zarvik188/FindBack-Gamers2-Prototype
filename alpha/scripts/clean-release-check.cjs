// Validate the committed runnable package in a clean directory and isolated database.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn, execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const repo = path.resolve(root, '../.github-publish/FindBack-Gamers2-Prototype');
const output = path.resolve(process.env.FINDBACK_EVIDENCE_DIR || path.join(root, 'alpha/evidence/2026-11-26'));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'findback-release-'));
const archive = path.join(temporary, 'release.zip');
const checkout = path.join(temporary, 'source');
const dbFile = path.join(temporary, 'fresh.db');
const port = 5192, base = `http://127.0.0.1:${port}`;
const checks = [];
let server;
const check = async (name, run) => { await run(); checks.push({ name, result: 'passed' }); };
async function start() {
  server = spawn(process.execPath, ['backend/server.mjs'], { cwd: checkout, env: { ...process.env, PORT: String(port), FINDBACK_DB: dbFile, DEMO_MODE: 'false' }, windowsHide: true, stdio: 'pipe' });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Clean server startup timed out')), 10000);
    server.stdout.once('data', () => { clearTimeout(timeout); resolve(); });
    server.once('error', error => { clearTimeout(timeout); reject(error); });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}`)); });
  });
}
async function stop() { if (server && server.exitCode === null) { await new Promise(resolve => { server.once('exit', resolve); server.kill(); }); } }
async function api(route, data, cookie = '') {
  const response = await fetch(base + '/api' + route, { method: data === undefined ? 'GET' : 'POST', headers: { ...(data === undefined ? {} : { 'Content-Type': 'application/json' }), Cookie: cookie }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] || '' };
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
  execFileSync('git', ['archive', '--format=zip', `--output=${archive}`, 'HEAD', 'backend', 'frontend', 'tests', 'package.json'], { cwd: repo });
  execFileSync(process.env.FINDBACK_PYTHON || 'python', ['-m', 'zipfile', '-e', archive, checkout]);
  await check('Clean release has no node_modules or existing SQLite data', async () => {
    assert.ok(!fs.existsSync(path.join(checkout, 'node_modules')));
    assert.ok(!fs.existsSync(path.join(checkout, 'backend/data/findback.db')));
    assert.ok(!fs.existsSync(dbFile));
  });
  await start();
  await check('Standard mode starts against an automatically created empty database', async () => {
    const health = await api('/health'); assert.equal(health.status, 200); assert.equal(health.body.mode, 'standard');
    assert.equal((await api('/items')).body.total, 0);
  });
  await check('Demo admin cannot be selected when DEMO_MODE is false', async () => assert.equal((await api('/demo', { persona: 'admin' })).status, 404));
  await check('HTML, JS, CSS and example image are served by the clean package', async () => {
    for (const file of ['/', '/app.js', '/style.css', '/images/bag.jpg']) { const response = await fetch(base + file); assert.equal(response.status, 200, file); assert.ok((await response.arrayBuffer()).byteLength > 0); }
  });
  const account = { name: '干净环境测试', email: 'clean-release@example.test', password: 'release-test-password' };
  const owner = await api('/register', account); assert.equal(owner.status, 200);
  let itemId;
  await check('New account publication persists as pending and stays hidden from anonymous users', async () => {
    const record = await api('/items', { type: 'found', title: '干净环境测试文件袋', category: '书籍文具', place: '图书馆', happened_on: new Date().toISOString().slice(0, 10), description: '课程自动验收记录，不包含真实个人信息。', question: '内页有什么标记？', private_note: '验收专用标记' }, owner.cookie);
    assert.equal(record.status, 201); itemId = record.body.id;
    assert.equal((await api('/items')).body.total, 0);
    assert.equal((await api('/items?mine=1', undefined, owner.cookie)).body.total, 1);
    assert.equal((await api('/items/' + itemId)).status, 404);
  });
  await stop(); await start();
  await check('Service restart retains account, item and its moderation state', async () => {
    const login = await api('/login', { email: account.email, password: account.password }); assert.equal(login.status, 200);
    const record = await api('/items/' + itemId, undefined, login.cookie); assert.equal(record.status, 200); assert.equal(record.body.item.moderation, 'pending');
    assert.equal(record.body.item.private_note, '验收专用标记');
  });
  await check('HTTP service does not expose backend source as a static asset', async () => assert.equal((await fetch(base + '/backend/schema.sql')).status, 404));
  const report = { observedAt: new Date().toISOString(), sourceCommit: commit, node: process.version, mode: 'standard', source: 'git archive of tracked runnable files', dependenciesInstalled: false, checks, limitations: ['Local clean release only', 'No production cloud deployment or backup/recovery drill', 'Synthetic account and isolated temporary database'] };
  fs.writeFileSync(path.join(output, 'clean-release.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(stop);
