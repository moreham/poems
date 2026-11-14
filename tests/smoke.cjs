const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const pageUrl = process.env.TEST_URL || pathToFileURL(path.resolve(__dirname, "..", "index.html")).href;

async function inspectViewport(browser, viewport) {
  const page = await browser.newPage({ viewport, isMobile: viewport.width < 720, deviceScaleFactor: viewport.width < 720 ? 3 : 1, reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(pageUrl);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);

  if (errors.length) throw new Error(errors.join(" | "));
  const initialVerse = await page.locator("#verse").getAttribute("aria-label");
  await page.evaluate(() => renderPoem("蓦然回首，那人却在，灯火阑珊处"));

  await page.waitForTimeout(50);
  const result = await page.evaluate(() => {
    const card = document.querySelector("#sign-card").getBoundingClientRect();
    const columns = [...document.querySelectorAll(".verse__column")];
    const columnData = columns.map((column) => ({
      text: column.textContent,
      x: column.getBoundingClientRect().x,
      bottom: column.getBoundingClientRect().bottom
    }));
    const button = document.querySelector("#draw-button").getBoundingClientRect();

    return {
      card: { x: card.x, y: card.y, right: card.right, bottom: card.bottom },
      columns: columnData,
      fontLoaded: document.fonts.check('35px "Huiwen Mincho"'),
      decorations: document.querySelectorAll('.bamboo, .masthead').length,
      verticalCharacters: columns.every(column => {
        const chars = [...column.children].map(el => el.getBoundingClientRect());
        return chars.every((rect, i) => i === 0 ||
          (Math.abs(rect.x - chars[i - 1].x) < 1 && rect.y > chars[i - 1].y));
      }),
      button: { x: button.x, y: button.y, right: button.right, bottom: button.bottom },
      viewport: { width: innerWidth, height: innerHeight },
      bodyOverflow: document.documentElement.scrollWidth > innerWidth,
      cardOverflow: columnData.some((column) => column.bottom > card.bottom)
    };
  });

  await page.locator("#draw-button").click();
  await page.waitForTimeout(700);
  const nextVerse = await page.locator("#verse").getAttribute("aria-label");

  const expectedColumns = ["蓦然回首，", "那人却在，", "灯火阑珊处"];
  const actualColumns = result.columns.map((column) => column.text);
  const rightToLeft = result.columns.every((column, index, columns) => (
    index === 0 || columns[index - 1].x > column.x
  ));
  const inViewport = result.card.x >= 0
    && result.card.right <= result.viewport.width
    && result.button.x >= 0
    && result.button.right <= result.viewport.width;

  if (errors.length) throw new Error(`Browser errors: ${errors.join(" | ")}`);
  if (JSON.stringify(actualColumns) !== JSON.stringify(expectedColumns)) {
    throw new Error(`Comma splitting failed: ${JSON.stringify(actualColumns)}`);
  }
  if (!result.fontLoaded || result.decorations || !result.verticalCharacters) {
    throw new Error(`Font or vertical layout check failed: ${JSON.stringify(result)}`);
  }
  if (!rightToLeft) throw new Error("Columns are not ordered from right to left");
  if (!inViewport || result.bodyOverflow || result.cardOverflow) {
    throw new Error(`Layout overflow at ${viewport.width}x${viewport.height}: ${JSON.stringify(result)}`);
  }
  if (!initialVerse || !nextVerse || initialVerse === nextVerse) {
    throw new Error("Draw interaction did not produce a new verse");
  }

  const layoutFailures = await page.evaluate(() => {
    const failures = [];
    for (const poem of POEMS) {
      renderPoem(poem);
      const area = verseElement.getBoundingClientRect();
      const columns = [...verseElement.children];
      for (const column of columns) {
        const chars = [...column.children];
        chars.forEach((char, index) => {
          const rect = char.getBoundingClientRect();
          const style = getComputedStyle(char);
          if (rect.left < area.left - 1 || rect.right > area.right + 1 ||
              rect.top < area.top - 1 || rect.bottom > area.bottom + 1 ||
              style.writingMode !== 'horizontal-tb' || style.overflow !== 'visible') {
            failures.push({ poem, character: char.textContent, index, rect: rect.toJSON(), area: area.toJSON(), font: style.fontSize });
          }
        });
      }
    }
    return failures;
  });
  if (layoutFailures.length) throw new Error(JSON.stringify(layoutFailures));

  const dataErrors = await page.evaluate(() => {
    const failures = [];
    if (POEMS.length !== 288 || Object.keys(INTERPRETATIONS).length !== 288) failures.push("Wrong coverage count");
    if (new Set(POEMS).size !== POEMS.length) failures.push("Duplicate verses");
    for (const poem of POEMS) {
      const entry = INTERPRETATIONS[poem];
      if (!entry || ["title", "author", "meaning", "original"].some(key => !entry[key]?.trim())) failures.push(poem);
    }
    const normalize = text => text.replace(/[^\p{Script=Han}]/gu, "");
    for (const poem of POEMS) {
      const entry = INTERPRETATIONS[poem];
      if (typeof entry?.excerpt !== "boolean") failures.push(`Missing excerpt flag: ${poem}`);
      const original = normalize(entry?.original || "");
      const parts = ["山无陵，天地合", "功不唐捐，玉汝于成"].includes(poem) ? poem.split("，") : [poem];
      let offset = 0;
      for (const part of parts) {
        const position = original.indexOf(normalize(part), offset);
        if (position < 0) failures.push(`Original does not contain verse: ${poem}`);
        offset = position + normalize(part).length;
      }
    }
    for (const typo of ["绿蚁焙新酒", "婉若清扬", "山无棱", "助我上青云", "却不知太守之乐其乐也"]) {
      if (POEMS.some(poem => poem.includes(typo))) failures.push(typo);
    }
    return failures;
  });
  if (dataErrors.length) throw new Error(`Interpretation data: ${dataErrors.join(" | ")}`);

  await page.evaluate(() => renderPoem("绿蚁新醅酒，红泥小火炉"));
  await page.locator("#interpret-button").click();
  const back = await page.evaluate(() => ({
    flipped: cardElement.classList.contains("is-flipped"),
    frontInert: frontFace.inert,
    backInert: backFace.inert,
    hidden: backFace.getAttribute("aria-hidden"),
    expanded: interpretButton.getAttribute("aria-expanded"),
    label: interpretButton.textContent,
    title: document.querySelector("#reading-title").textContent,
    meaning: document.querySelector("#reading-meaning").textContent,
    original: document.querySelector("#reading-original").textContent,
    originalLabel: document.querySelector("#reading-original-label").textContent,
    whitespace: getComputedStyle(document.querySelector("#reading-original")).whiteSpace,
    oldAdvice: !!document.querySelector("#reading-insight") || reading.textContent.includes("一点启发"),
    expectedMeaning: INTERPRETATIONS["绿蚁新醅酒，红泥小火炉"].meaning,
    sourceHidden: document.querySelector("#reading-source").hidden,
    sourceDisplay: getComputedStyle(document.querySelector("#reading-source")).display,
    overflow: reading.scrollWidth > reading.clientWidth
  }));
  if (!back.flipped || !back.frontInert || back.backInert || back.hidden !== "false" ||
      back.expanded !== "true" || back.label !== "返回签面" || back.title !== "问刘十九" ||
      back.meaning !== back.expectedMeaning || back.overflow ||
      back.original !== "绿蚁新醅酒，红泥小火炉。\n晚来天欲雪，能饮一杯无？" ||
      back.originalLabel !== "原文" || back.whitespace !== "pre-line" || back.oldAdvice ||
      (back.sourceHidden && back.sourceDisplay !== "none")) throw new Error(`Flip failed: ${JSON.stringify(back)}`);
  await page.evaluate(() => renderInterpretation("停云霭霭，时雨濛濛"));
  const linkedSource = await page.locator("#reading-source").evaluate(el => ({ hidden: el.hidden, href: el.href, display: getComputedStyle(el).display }));
  if (linkedSource.hidden || !linkedSource.href.startsWith("https://") || linkedSource.display === "none") throw new Error("Verified source link unavailable");
  await page.evaluate(() => renderInterpretation("绿蚁新醅酒，红泥小火炉"));
  await page.screenshot({ path: path.join(__dirname, `back-${viewport.width}.png`), fullPage: true });

  // Check every back fits horizontally and overflowing content can actually scroll.
  const backFailures = await page.evaluate(() => {
    const failures = [];
    for (const poem of POEMS) {
      renderInterpretation(poem);
      const entry = INTERPRETATIONS[poem];
      if (document.querySelector("#reading-original").textContent !== entry.original ||
          document.querySelector("#reading-original-label").textContent !== (entry.excerpt ? "原文（节选）" : "原文")) failures.push(`Wrong original rendered: ${poem}`);
      if (reading.scrollWidth > reading.clientWidth) failures.push(poem);
      if (reading.scrollHeight > reading.clientHeight) {
        reading.scrollTop = reading.scrollHeight;
        if (reading.scrollTop <= 0) failures.push(`Cannot scroll: ${poem}`);
      }
    }
    return failures;
  });
  if (backFailures.length) throw new Error(`Back layout: ${backFailures.join(" | ")}`);
  await page.locator("#reading").focus();
  await page.keyboard.press("Escape");
  if (await page.locator("#interpret-button").textContent() !== "一键解读") throw new Error("Escape did not return to front");
  await page.locator("#interpret-button").click();
  await page.locator("#draw-button").click();
  await page.waitForTimeout(700);
  const resetOK = await page.evaluate(() => !isFlipped && !frontFace.inert && backFace.inert &&
    !interpretButton.disabled && document.querySelector("#reading-title").textContent === INTERPRETATIONS[POEMS[currentIndex]].title);
  if (!resetOK) throw new Error("Redraw did not reset and update interpretation");

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator("#interpret-button").click();
  await page.waitForTimeout(160);
  const during = await page.locator(".sign-card__inner").evaluate(el => getComputedStyle(el).transform);
  await page.waitForTimeout(650);
  const after = await page.locator(".sign-card__inner").evaluate(el => getComputedStyle(el).transform);
  if (during === after || !after.startsWith("matrix3d(-1")) throw new Error(`Flip animation missing: ${during} -> ${after}`);

  await page.close();
  return {
    viewport: `${viewport.width}x${viewport.height}`,
    initialVerse,
    nextVerse,
    columns: actualColumns,
    allPoemsFit: true,
    allInterpretationsFit: true,
    originalsAndExcerpts: true,
    flipAndRedraw: true
  };
}

(async () => {
  const launchOptions = { headless: true };
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  if (fs.existsSync(edgePath)) launchOptions.executablePath = edgePath;
  const browser = await chromium.launch(launchOptions);
  try {
    const results = [];
    results.push(await inspectViewport(browser, { width: 320, height: 568 }));
    results.push(await inspectViewport(browser, { width: 390, height: 844 }));
    results.push(await inspectViewport(browser, { width: 1440, height: 900 }));
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
