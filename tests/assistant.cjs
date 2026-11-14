const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const pageUrl = process.env.TEST_URL || pathToFileURL(path.resolve(__dirname, "..", "index.html")).href;

async function testAssistant(browser, viewport) {
  const page = await browser.newPage({ viewport, isMobile: viewport.width < 720, reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(pageUrl);
  await page.evaluate(() => {
    window.fetch = async (url, options) => {
      window.__assistantRequest = { url, headers: options.headers, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({
        choices: [{ message: { content: "先看诗意，再看当下。\n1. 列出你能控制的事。\n2. 给决定留一晚。<img src=x onerror=alert(1)>" } }]
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    };
  });

  await page.locator("#assistant-button").click();
  if (!await page.locator("#assistant-dialog").evaluate(element => element.open)) throw new Error("Assistant dialog did not open");
  if (!await page.locator("#assistant-config").isVisible()) throw new Error("Assistant config is not visible");

  await page.locator("#assistant-endpoint").fill("https://mock.example/v1/chat/completions");
  await page.locator("#assistant-api-key").fill("test-secret");
  await page.locator("#assistant-model").fill("test-model");
  await page.locator("#assistant-config-form button[type=submit]").click();
  if (!await page.locator("#assistant-chat").isVisible()) throw new Error("Assistant chat is not visible after configuration");

  const selectedPoem = await page.locator("#verse").getAttribute("aria-label");
  if (await page.locator("#assistant-poem-text").textContent() !== selectedPoem) throw new Error("Assistant poem is out of sync");

  await page.locator("#assistant-question").fill("这支签对工作选择有什么启发？");
  await page.locator("#assistant-submit").click();
  await page.locator("#assistant-answer").waitFor({ state: "visible" });

  const result = await page.evaluate(() => ({
    request: window.__assistantRequest,
    answerText: document.querySelector("#assistant-answer-content").textContent,
    answerHTML: document.querySelector("#assistant-answer-content").innerHTML,
    dialog: document.querySelector("#assistant-dialog").getBoundingClientRect().toJSON(),
    viewport: { width: innerWidth, height: innerHeight },
    overflow: document.querySelector("#assistant-dialog").scrollWidth > document.querySelector("#assistant-dialog").clientWidth
  }));

  if (result.request.url !== "https://mock.example/v1/chat/completions") throw new Error("Wrong API endpoint");
  if (result.request.headers.Authorization !== "Bearer test-secret") throw new Error("Missing API authorization header");
  if (result.request.body.model !== "test-model") throw new Error("Wrong model in API request");
  if (!result.request.body.messages[1].content.includes(selectedPoem) ||
      !result.request.body.messages[1].content.includes("工作选择")) throw new Error("Prompt is missing poem or question");
  if (!result.answerText.includes("<img") || result.answerHTML.includes("<img")) throw new Error("AI output was not rendered safely");
  if (result.overflow || result.dialog.left < 0 || result.dialog.right > result.viewport.width ||
      result.dialog.top < 0 || result.dialog.bottom > result.viewport.height + 1) throw new Error(`Assistant dialog overflow: ${JSON.stringify(result)}`);

  await page.screenshot({ path: path.join(__dirname, `assistant-${viewport.width}.png`), fullPage: true });
  await page.locator("#assistant-close").click();
  await page.locator("#draw-button").click();
  await page.waitForTimeout(700);
  await page.locator("#assistant-button").click();
  if (await page.locator("#assistant-answer").isVisible()) throw new Error("Old AI answer was not cleared after redraw");
  if (errors.length) throw new Error(errors.join(" | "));

  await page.close();
  return { viewport: `${viewport.width}x${viewport.height}`, requestAndAnswer: true, outputEscaped: true, redrawReset: true };
}

(async () => {
  const launchOptions = { headless: true };
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  if (fs.existsSync(edgePath)) launchOptions.executablePath = edgePath;
  const browser = await chromium.launch(launchOptions);
  try {
    const results = [];
    results.push(await testAssistant(browser, { width: 320, height: 568 }));
    results.push(await testAssistant(browser, { width: 390, height: 844 }));
    results.push(await testAssistant(browser, { width: 1440, height: 900 }));
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
