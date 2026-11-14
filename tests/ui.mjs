import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { mailCode } from './helpers.mjs';
const base = process.env.TEST_URL || 'http://127.0.0.1:18001';
const mailpit = process.env.MAILPIT_URL || 'http://127.0.0.1:18025';
assert(new URL(base).port === '18001', 'UI 测试仅允许使用隔离环境 18001 端口');
const output = process.env.SCREENSHOT_DIR || 'test-results';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const reader = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const manager = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await reader.newPage(), admin = await manager.newPage();
const errors = [];
for (const target of [page, admin]) target.on('pageerror', error => errors.push(error.message));
const suffix = randomUUID().slice(0, 8), email = `ui-${suffix}@example.com`;
const firstVerse = `清风携诗入梦来${suffix}`, secondVerse = `明月照我读书窗${suffix}`;
const meaning = '<script>alert(1)</script>这里是以文本呈现的诗意解读。';
async function chooseMenu(name) {
  await page.getByRole('button', { name: '更多', exact: true }).click();
  await page.getByRole('navigation', { name: '用户导航' }).getByRole('button', { name, exact: true }).click();
}
async function submit(verse) {
  const dialog = page.getByRole('dialog', { name: '分享一句好诗' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('诗句（必填）', { exact: true }).fill(verse);
  await dialog.getByLabel('作品名称（必填）', { exact: true }).fill('测试诗笺');
  await dialog.getByLabel('作者（必填）', { exact: true }).fill('测试作者');
  await dialog.getByLabel('诗意解读（必填）', { exact: true }).fill(meaning);
  await dialog.getByRole('button', { name: '提交审核', exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
async function noOverflow(target) {
  assert(await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '页面不应横向溢出');
}
try {
  await page.goto(base);
  await expect(page.locator('#verse')).not.toBeEmpty();
  const like = page.locator('#like-button');
  await expect(like).toBeEnabled();
  const initial = Number(await page.locator('#like-count').textContent());
  await like.click(); await expect(like).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#like-count')).toHaveText(String(initial + 1));
  await like.click(); await expect(like).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#like-count')).toHaveText(String(initial));
  await page.locator('#interpret-button').click();
  await expect(page.locator('#sign-card')).toHaveClass(/is-flipped/);
  await expect(page.locator('#reading-meaning')).not.toBeEmpty();
  const original = await page.locator('#verse').getAttribute('aria-label');
  await page.locator('#draw-button').click();
  await expect(page.locator('#verse')).not.toHaveAttribute('aria-label', original);
  await page.screenshot({ path: `${output}/poems-home.png`, fullPage: true });
  await chooseMenu('投稿诗句');
  await expect(page.getByRole('dialog', { name: '邮箱登录' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: '分享一句好诗' })).not.toBeVisible();
  await page.getByLabel('邮箱地址', { exact: true }).fill(email);
  await page.getByRole('button', { name: '发送验证码', exact: true }).click();
  await expect(page.getByText('验证码已发送，请查收邮箱', { exact: true })).toBeVisible();
  await page.getByPlaceholder('6 位验证码').fill(await mailCode(mailpit, email));
  await page.getByRole('button', { name: '验证并登录', exact: true }).click();
  await submit(firstVerse);
  await chooseMenu('投稿诗句');
  await submit(secondVerse);
  await chooseMenu('我的投稿');
  await expect(page.getByRole('heading', { name: '投稿记录', exact: true })).toBeVisible();
  const firstRow = page.locator('.el-table__row').filter({ hasText: firstVerse });
  const secondRow = page.locator('.el-table__row').filter({ hasText: secondVerse });
  await expect(firstRow).toContainText('待审核');
  await firstRow.getByRole('button', { name: '查看详情' }).click();
  const details = page.getByRole('dialog', { name: '投稿详情', exact: true });
  await expect(details).toContainText(meaning);
  assert.equal(await details.locator('script').count(), 0);
  await details.getByRole('button', { name: '关闭此对话框' }).click();
  // A logged-in reader still sees the independent admin login.
  const guard = await reader.newPage(); await guard.goto(`${base}/admin`);
  await expect(guard.getByRole('heading', { name: '管理员验证' })).toBeVisible(); await guard.close();
  await admin.goto(`${base}/admin`);
  await admin.getByLabel('管理员密钥', { exact: true }).fill('test-admin-key-only-12345');
  await admin.getByRole('button', { name: '进入后台', exact: true }).click();
  await expect(admin.getByRole('heading', { name: '投稿审核', exact: true })).toBeVisible();
  await admin.locator('.el-table__row').filter({ hasText: firstVerse }).getByRole('button', { name: '查看并审核' }).click();
  await admin.getByRole('button', { name: '通过审核', exact: true }).click();
  await admin.getByRole('button', { name: '确认通过', exact: true }).click();
  await expect(admin.getByRole('dialog', { name: '投稿详情与审核', exact: true })).not.toBeVisible();
  await admin.locator('.el-table__row').filter({ hasText: secondVerse }).getByRole('button', { name: '查看并审核' }).click();
  await admin.getByRole('button', { name: '驳回', exact: true }).click();
  await admin.getByLabel('驳回理由（选填，投稿人可见）').fill('请补充可核对的诗句出处');
  await admin.getByRole('button', { name: '确认驳回', exact: true }).click();
  await expect(admin.getByRole('dialog', { name: '驳回投稿', exact: true })).not.toBeVisible();
  await admin.screenshot({ path: `${output}/poems-admin.png`, fullPage: true });
  await page.getByRole('button', { name: '刷新记录' }).click();
  await expect(firstRow).toContainText('通过'); await expect(secondRow).toContainText('驳回');
  await secondRow.getByRole('button', { name: '查看详情' }).click();
  await expect(details).toContainText('请补充可核对的诗句出处');
  await details.getByRole('button', { name: '关闭此对话框' }).click();
  const poems = await (await page.request.get(`${base}/api/poems`)).json();
  assert(poems.poems.some(poem => poem.verse === firstVerse));
  assert(!poems.poems.some(poem => poem.verse === secondVerse));
  await page.screenshot({ path: `${output}/poems-records.png`, fullPage: true });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 }); await noOverflow(page);
    await admin.setViewportSize({ width, height: 844 }); await noOverflow(admin);
    await page.getByRole('button', { name: '再投一句' }).click(); await noOverflow(page);
    await page.getByRole('button', { name: '暂不提交', exact: true }).click();
  }
  await chooseMenu('退出登录');
  await expect(page.getByRole('heading', { name: '登录后查看你的投稿' })).toBeVisible();
  await admin.getByRole('button', { name: '退出管理', exact: true }).click();
  await expect(admin.getByRole('heading', { name: '管理员验证' })).toBeVisible();
  await page.goto(base);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 }); await noOverflow(page);
    const left = await page.locator('#interpret-button').boundingBox(), right = await page.locator('#draw-button').boundingBox();
    assert(Math.abs(left.y - right.y) < 2 && left.x + left.width <= right.x, '解读和抽签按钮应并排');
    await page.screenshot({ path: `${output}/poems-mobile-${width}.png`, fullPage: true });
  }
  assert.deepEqual(errors, [], '浏览器不应存在 JavaScript 异常');
  console.log('UI 测试通过：游客抽签/解读/点赞取消、邮箱登录、投稿、审核通过与驳回、记录与理由、退出、权限入口、320/390px 布局。');
} finally { await browser.close(); }
