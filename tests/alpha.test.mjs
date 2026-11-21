import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../backend/database.mjs';
import { handleApi } from '../backend/service.mjs';

async function withApi(run, options = {}) {
  const db = openDatabase(':memory:');
  const request = async (endpoint, data, cookie = '', headers = {}) => {
    const response = await handleApi(new Request(`http://localhost/api${endpoint}`, {
      method: data === undefined ? 'GET' : 'POST',
      headers: { ...(data === undefined ? {} : { 'Content-Type': 'application/json' }), Cookie: cookie, ...headers },
      ...(data === undefined ? {} : { body: JSON.stringify(data) })
    }), { DB: db, ...options });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] || '' };
  };
  try { await run({ db, request }); } finally { db.close(); }
}

test('A02: fractional pagination is normalized rather than causing a database error', async () => {
  await withApi(async ({ request }) => {
    await request('/demo', { persona: 'owner' });
    for (const value of ['1.1', '1.01', '2.25']) {
      const result = await request(`/items?page=${value}`);
      assert.equal(result.status, 200, `page=${value}`);
      assert.equal(result.body.page, Math.floor(Number(value)));
    }
  });
});

test('A02: pagination rejects nonfinite values by falling back to page one', async () => {
  await withApi(async ({ request }) => {
    for (const value of ['NaN', 'Infinity', '-Infinity', 'abc', '', '-5', '0']) {
      const result = await request(`/items?page=${value}`);
      assert.equal(result.status, 200);
      assert.equal(result.body.page, 1, `page=${value}`);
    }
    assert.equal((await request('/items?page=9999999')).body.page, 10000);
  });
});

test('A03: standard mode disables all demo identities and reports its mode', async () => {
  await withApi(async ({ request }) => {
    assert.equal((await request('/health')).body.mode, 'standard');
    assert.equal((await request('/demo', { persona: 'admin' })).status, 404);
    assert.equal((await request('/me')).body.user, null);
  }, { DEMO_MODE: 'false' });
});

test('A03: expired sessions lose access to private resources', async () => {
  await withApi(async ({ db, request }) => {
    const owner = await request('/demo', { persona: 'owner' });
    await db.prepare('UPDATE sessions SET expires_at=?').bind('2000-01-01T00:00:00.000Z').run();
    assert.equal((await request('/me', undefined, owner.cookie)).body.user, null);
    assert.equal((await request('/notices', undefined, owner.cookie)).status, 401);
    assert.equal((await request('/admin/items', undefined, owner.cookie)).status, 401);
  });
});

test('A03: JSON arrays, primitive bodies and wrong media types fail predictably', async () => {
  await withApi(async ({ request }) => {
    for (const value of [[], null, 'text', 123]) assert.equal((await request('/login', value)).status, 400);
    assert.equal((await request('/login', {}, '', { 'Content-Type': 'text/plain' })).status, 415);
  });
});

test('A03: oversized API bodies are rejected before business processing', async () => {
  await withApi(async ({ request }) => {
    assert.equal((await request('/login', { padding: 'x'.repeat(360001) })).status, 413);
  });
});

test('A03: a third party cannot inspect evidence or confirm another handover', async () => {
  await withApi(async ({ request }) => {
    const owner = (await request('/demo', { persona: 'owner' })).cookie;
    const claimant = (await request('/demo', { persona: 'claimant' })).cookie;
    const stranger = (await request('/register', { name: '旁观测试者', email: 'outsider@example.test', password: 'alpha-pass-123' })).cookie;
    const claim = await request('/items/demo-bag/claims', { evidence: '包内有黄色数学笔记本' }, claimant);
    await request(`/claims/${claim.body.id}/review`, { decision: 'approved', note: '特征相符' }, owner);
    const detail = await request('/items/demo-bag', undefined, stranger);
    assert.deepEqual(detail.body.claims, []);
    assert.deepEqual(detail.body.events, []);
    assert.equal((await request(`/claims/${claim.body.id}/confirm`, {}, stranger)).status, 403);
  });
});

test('A03: a failed batch rolls back every write in the transaction', async () => {
  await withApi(async ({ db, request }) => {
    await request('/demo', { persona: 'owner' });
    const before = await db.prepare('SELECT name FROM users WHERE id=?').bind('demo-owner').first();
    await assert.rejects(db.batch([
      db.prepare('UPDATE users SET name=? WHERE id=?').bind('不应保留的修改', 'demo-owner'),
      db.prepare('INSERT INTO users(id,name,email,created_at) VALUES (?,?,?,?)').bind('demo-owner', '重复用户', 'dup@example.test', new Date().toISOString())
    ]));
    assert.deepEqual(await db.prepare('SELECT name FROM users WHERE id=?').bind('demo-owner').first(), before);
  });
});
