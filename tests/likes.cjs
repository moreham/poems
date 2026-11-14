const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { once } = require('node:events');
const { chromium } = require('playwright');
const { expect } = require('playwright/test');

async function main() {
  const root = path.resolve(__dirname, '..');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'poems-likes-test-'));
  const server = spawn('python', ['-u', '-c',
    'import runpy, sys; m=runpy.run_path("tools/public-server.py"); s=m["PoetryServer"](("127.0.0.1", 0), sys.argv[1]); print(s.server_port, flush=True); s.serve_forever()',
    path.join(temp, 'likes.sqlite3')], { cwd: root, windowsHide: true });
  let browser;
  try {
    const port = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server startup timeout')), 10000);
      server.stdout.once('data', chunk => { clearTimeout(timeout); resolve(Number(chunk.toString().trim())); });
      server.once('error', error => { clearTimeout(timeout); reject(error); });
      server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}`)); });
    });
    server.stderr.resume();
    assert(Number.isInteger(port) && port > 0);
    const url = `http://127.0.0.1:${port}`;
    const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    browser = await chromium.launch({ headless: true, ...(fs.existsSync(edge) ? { executablePath: edge } : {}) });
    const errors = [];
    const a = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const b = await browser.newContext();
    const pageA = await a.newPage();
    const pageB = await b.newPage();
    for (const page of [pageA, pageB]) page.on('pageerror', error => errors.push(error.message));
    const poem = '绿蚁新醅酒，红泥小火炉';
    async function show(page, text = poem) {
      await page.evaluate(text => renderPoem(text), text);
      await expect(page.locator('#like-count')).not.toHaveText('—');
    }
    await pageA.goto(url);
    await show(pageA);
    await expect(pageA.locator('#like-count')).toHaveText('0');
    await pageA.locator('#like-button').click();
    await expect(pageA.locator('#like-count')).toHaveText('1');
    await expect(pageA.locator('#like-button')).toBeDisabled();
    await expect(pageA.locator('#like-button')).toHaveAttribute('aria-pressed', 'true');
    await pageB.goto(url);
    await show(pageB);
    await expect(pageB.locator('#like-count')).toHaveText('1');
    await pageB.locator('#like-button').click();
    await expect(pageB.locator('#like-count')).toHaveText('2');
    await pageA.reload();
    await show(pageA);
    await expect(pageA.locator('#like-count')).toHaveText('2');
    await expect(pageA.locator('#like-button')).toBeEnabled();
    await pageA.locator('#like-button').click();
    await expect(pageA.locator('#like-count')).toHaveText('3');
    // Drawing the same poem again permits another like from the same browser.
    await show(pageA);
    await expect(pageA.locator('#like-button')).toBeEnabled();
    await pageA.locator('#like-button').click();
    await expect(pageA.locator('#like-count')).toHaveText('4');
    await expect(pageA.locator('#like-button')).toBeDisabled();
    const refreshed = pageA.waitForResponse(response => response.url().includes('/api/likes?'));
    await pageA.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await refreshed;
    await expect(pageA.locator('#like-button')).toBeDisabled();

    // Mobile/desktop layout and the existing controls remain reachable.
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      await pageA.setViewportSize(viewport);
      const layout = await pageA.evaluate(() => {
        const rect = document.querySelector('#like-button').getBoundingClientRect();
        return { left: rect.left, right: rect.right, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert(!layout.overflow && layout.left >= 0 && layout.right <= viewport.width);
      await pageA.screenshot({ path: path.join(__dirname, `likes-${viewport.width}.png`), fullPage: true });
    }
    await show(pageA, '长风破浪会有时');
    await expect(pageA.locator('#like-count')).toHaveText('0');
    await expect(pageA.locator('#like-button')).toBeEnabled();
    // A failed write must not invent a count; the next successful attempt recovers.
    await pageA.route('**/api/likes', route => route.fulfill({ status: 503, body: '{}' }));
    await pageA.locator('#like-button').click();
    await expect(pageA.locator('#like-status')).toContainText('点赞未确认');
    await expect(pageA.locator('#like-count')).toHaveText('0');
    await pageA.unroute('**/api/likes');
    await pageA.locator('#like-button').click();
    await expect(pageA.locator('#like-count')).toHaveText('1');
    // Hold an old read until after changing the poem; it must not overwrite the new count.
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await pageA.route('**/api/likes?*', async route => {
      if (new URL(route.request().url()).searchParams.get('poem') === poem) {
        await gate;
        await route.fulfill({ json: { count: 999, total: 999, liked: false } }).catch(() => {});
      } else await route.continue();
    });
    const requested = pageA.waitForRequest(request => request.url().includes('/api/likes?') && new URL(request.url()).searchParams.get('poem') === poem);
    await pageA.evaluate(text => renderPoem(text), poem);
    await requested;
    await show(pageA, '长风破浪会有时');
    release();
    await expect(pageA.locator('#like-count')).toHaveText('1');
    await pageA.unroute('**/api/likes?*');
    assert.deepEqual(errors, []);
    console.log('PASS: shared counts, per-draw deduplication, reload, repeat poem, failed write retry, stale response, 3 viewport layouts');
    await browser.close();
    browser = null;
    for (const test of ['smoke.cjs', 'assistant.cjs']) {
      const output = execFileSync(process.execPath, [path.join(__dirname, test)], {
        cwd: root, env: { ...process.env, TEST_URL: url }, encoding: 'utf8', windowsHide: true
      });
      console.log(`${test}: ${output.trim()}`);
    }
  } finally {
    if (browser) await browser.close();
    const exited = once(server, 'exit');
    server.kill();
    await exited;
    const resolved = path.resolve(temp);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('poems-likes-test-')) {
      throw new Error('Unsafe temporary directory');
    }
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

