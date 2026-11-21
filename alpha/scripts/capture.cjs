// Run with FINDBACK_PLAYWRIGHT_MODULE pointing at an installed Playwright package.
const { chromium, expect } = require(process.env.FINDBACK_PLAYWRIGHT_MODULE || 'playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const output = path.resolve(process.env.FINDBACK_CAPTURE_DIR || path.join(root, 'alpha/evidence/2026-11-21'));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'findback-alpha-'));
const port = 5187, url = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['backend/server.mjs'], { cwd: root, env: { ...process.env, PORT: String(port), FINDBACK_DB: path.join(temp, 'capture.db') }, windowsHide: true, stdio: 'pipe' });
let browser;
const checks = [], errors = [];
async function main() {
  fs.mkdirSync(output, { recursive: true });
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error(`Server exited ${code}`))); });
  browser = await chromium.launch({ headless: true, ...(process.env.FINDBACK_BROWSER_EXECUTABLE ? { executablePath: process.env.FINDBACK_BROWSER_EXECUTABLE } : {}) });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1040 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => errors.push(error.message));
  async function shot(name) { await page.screenshot({ path: path.join(output, name), fullPage: true }); }
  async function check(name, fn) { await fn(); checks.push({ name, status: 'passed' }); }
  async function switchRole(role) {
    await page.locator('[data-action="auth"]').first().click();
    await page.locator(`[data-persona="${role}"]`).click();
    await page.locator('#auth-dialog').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => !document.querySelector('#content .loading'));
  }
  await page.goto(url);
  await switchRole('claimant');
  await check('Desktop catalogue contains six seeded items', async () => { await page.waitForFunction(() => document.querySelectorAll('.grid .item-card').length === 6); });
  await shot('01-home.png');
  await page.getByRole('textbox', { name: '搜索物品' }).fill('不存在的紫色铅笔盒');
  await page.locator('#search-form button').click();
  await check('Empty search gives an explicit message', async () => { await page.getByText('暂时没有匹配的物品').waitFor(); });
  await shot('02-empty.png');
  await page.locator('[data-action="clear-filter"]').click();
  await page.goto(url + '/#/item/demo-bag');
  await page.locator('[data-action="claim"]').click();
  await page.locator('#claim-form textarea').fill('包内有一本黄色封面的高等数学笔记');
  await page.locator('#claim-form button').click();
  await check('Claim appears in applicant view', async () => { await page.getByText('我的认领进度', { exact: true }).waitFor(); await page.getByText('包内有一本黄色封面的高等数学笔记', { exact: true }).waitFor(); });
  await switchRole('owner');
  await page.locator('[data-action="review"][data-decision="approved"]').click();
  await page.locator('#review-form textarea').fill('已核对包内未公开物品，特征相符');
  await page.locator('#review-form button').click();
  await page.locator('[data-action="confirm"]').click();
  await check('One confirmation keeps item in handover', async () => { await page.getByText('本方已确认，等待另一方完成。', { exact: true }).waitFor(); });
  await shot('03-one-confirmation.png');
  await switchRole('claimant');
  await page.locator('[data-action="confirm"]').click();
  await check('Two confirmations mark item returned', async () => { await page.getByText('双方已确认，物品已归还。', { exact: true }).waitFor(); });
  await shot('04-returned.png');
  await page.goto(url + '/#/messages');
  await page.getByRole('heading', { name: '消息中心' }).waitFor();
  await shot('05-notices.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.getByRole('heading', { name: '校园失物招领', exact: true }).waitFor();
  await check('390px home viewport has no horizontal overflow', async () => { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); });
  await shot('06-mobile.png');
  assert.deepEqual(errors, []);
  const report = { observedAt: new Date().toISOString(), timezone: 'Asia/Shanghai', tool: 'Playwright Chromium', browserVersion: browser.version(), viewport: '1440x1040 and 390x844', checks, pageErrors: errors, limitations: ['Single local Chromium engine', 'Seeded teaching identities and isolated temporary SQLite database', 'No campus deployment, load test, user study or security audit'] };
  fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.kill(); });
