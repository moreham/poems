import 'dotenv/config';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
const base = process.env.APP_ORIGIN;
assert.equal(base, 'http://127.0.0.1:8001', '仅检查本地正式部署');
assert.equal((await (await fetch(`${base}/api/health`)).json()).status, 'ok');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = []; page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(base);
  await expect(page.locator('#like-button')).toBeEnabled();
  await expect(page.locator('#verse')).not.toBeEmpty();
  await expect(page.getByRole('button', { name: '投稿诗句', exact: true })).toBeEnabled();
  await page.goto(`${base}/admin`);
  await page.getByLabel('管理员账号', { exact: true }).fill(process.env.ADMIN_USERNAME);
  await page.getByLabel('管理员密码', { exact: true }).fill(process.env.ADMIN_PASSWORD);
  await page.getByRole('button', { name: '登录后台', exact: true }).click();
  await expect(page.getByRole('heading', { name: '投稿审核', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '退出管理', exact: true }).click();
  await expect(page.getByRole('heading', { name: '管理员登录' })).toBeVisible();
  assert.deepEqual(errors, []);
  console.log('PASS: deployed health, assets, guest drawing, like loading, configured administrator login and logout');
} finally { await browser.close(); }
