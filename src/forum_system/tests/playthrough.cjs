const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      (require("node:fs").existsSync(
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      )
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : undefined),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`);
  });
  const url = process.env.GAME_URL || "http://127.0.0.1:4173";
  const out = path.join(__dirname, "screenshots");
  fs.mkdirSync(out, { recursive: true });
  const act = async (action, extra = "") =>
    page.locator(`[data-action="${action}"]${extra}`).first().click();
  const nav = async (v) => act("nav", `[data-view="${v}"]`);
  const post = async (id) => act("post", `[data-id="${id}"]`);
  const collect = async (id) => act("collect", `[data-id="${id}"]`);
  const state = async () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem("weiming-lantern-save-v1")),
    );
  const close = async () => act("close");
  const chat = async (key, contact = "north") => {
    await act("chat", `[data-key="${key}"]`);
    await page.waitForFunction(
      ({ key, contact }) =>
        JSON.parse(localStorage.getItem("weiming-lantern-save-v1")).chats[
          contact
        ].includes(key),
      { key, contact },
    );
  };
  await page.goto(url);
  await page.screenshot({
    path: path.join(out, "01-forum-desktop.png"),
    fullPage: true,
  });
  assert.equal(await page.locator(".post-row").count(), 6);
  await nav("scene");
  assert.match(await page.locator("main").innerText(), /还不知道/);
  await nav("messages");
  assert.equal(await page.locator('[data-key="archive"]').isDisabled(), true);
  await nav("forum");
  await post("river");
  await collect("lamp");
  await act("ask", '[data-index="0"]');
  assert.match(await page.locator(".comments").innerText(), /找个伴/);
  await page.locator("#reply-input").fill('<script>alert("test")</script> 灯');
  await page.locator('[data-form="reply"] button').click();
  assert.match(await page.locator(".comments").innerText(), /<script>/);
  await page.screenshot({
    path: path.join(out, "02-thread.png"),
    fullPage: true,
  });
  await nav("forum");
  await post("customs");
  await collect("custom");
  await nav("forum");
  await post("archive");
  await collect("news");
  await nav("messages");
  await chat("hello");
  await chat("archive");
  assert.ok((await state()).clues.includes("address"));
  await page.screenshot({
    path: path.join(out, "03-messages.png"),
    fullPage: true,
  });
  await nav("scene");
  await act("hotspot", '[data-id="ledger"]');
  await act("field-collect", '[data-id="ledger"]');
  await act("hotspot", '[data-id="safe"]');
  await page.locator("#safe-code").fill("1972");
  await page.locator('[data-form="safe"] button').click();
  assert.match(await page.locator("#safe-error").innerText(), /建成/);
  await page.locator("#safe-code").fill("0716");
  await page.locator('[data-form="safe"] button').click();
  await act("play-tape");
  await page.waitForFunction(
    () => document.getElementById("tape-button")?.textContent.includes("停止"),
    {},
    { timeout: 10000 },
  );
  await act("field-collect", '[data-id="tape"]');
  await act("hotspot", '[data-id="paper"]');
  await act("field-collect", '[data-id="paper"]');
  await page.screenshot({
    path: path.join(out, "04-scene.png"),
    fullPage: true,
  });
  await nav("messages");
  await act("contact", '[data-contact="rain"]');
  await chat("identity", "rain");
  assert.equal((await state()).clues.length, 8);
  await nav("board");
  await page
    .locator("#personal-notes")
    .fill("陈渡留下了。别把剪报的日期当作事故日期。");
  await act("select-clue", '[data-id="lamp"]');
  await act("select-clue", '[data-id="news"]');
  await act("connect");
  assert.equal((await state()).links.length, 0);
  await act("select-clue", '[data-id="news"]');
  await act("select-clue", '[data-id="custom"]');
  await act("connect");
  await close();
  for (const pair of [
    ["news", "ledger"],
    ["tape", "survivor"],
  ]) {
    for (const id of pair) await act("select-clue", `[data-id="${id}"]`);
    await act("connect");
    await close();
  }
  assert.equal((await state()).links.length, 3);
  await page.screenshot({
    path: path.join(out, "05-board.png"),
    fullPage: true,
  });
  await act("verdict");
  await page.selectOption("#answer-name", "shen");
  await page.selectOption("#answer-cause", "rain");
  await page.selectOption("#answer-rite", "red");
  await page.locator('[data-form="verdict"] button').click();
  assert.match(await page.locator("#verdict-error").innerText(), /名字/);
  await page.selectOption("#answer-name", "chen");
  await page.selectOption("#answer-cause", "gate");
  await page.selectOption("#answer-rite", "white");
  await page.locator('[data-form="verdict"] button').click();
  await act("ending", '[data-ending="truth"]');
  assert.match(await page.locator(".ending h2").innerText(), /有了名字/);
  await page.screenshot({
    path: path.join(out, "06-ending.png"),
    fullPage: true,
  });
  await act("verdict");
  await page.selectOption("#answer-name", "chen");
  await page.selectOption("#answer-cause", "gate");
  await page.selectOption("#answer-rite", "white");
  await page.locator('[data-form="verdict"] button').click();
  await act("ending", '[data-ending="silence"]');
  assert.match(await page.locator(".ending h2").innerText(), /灯还亮着/);
  assert.equal((await state()).endings.length, 2);
  await page.reload();
  assert.equal((await state()).clues.length, 8);
  await nav("board");
  assert.equal(
    await page.locator("#personal-notes").inputValue(),
    "陈渡留下了。别把剪报的日期当作事故日期。",
  );
  await act("settings");
  const download = page.waitForEvent("download");
  await act("export-save");
  const dl = await download;
  assert.match(dl.suggestedFilename(), /存档/);
  await close();
  await act("settings");
  await page
    .locator("#import-file")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from("{}"),
    });
  assert.equal((await state()).clues.length, 8);
  await close();
  // Search and filter are real, not decorative controls.
  await nav("forum");
  await page.locator(".search-form input").fill("陈渡");
  await page.locator(".search-form button").click();
  assert.ok((await page.locator(".post-row").count()) >= 1);
  await page.locator(".search-form input").fill("");
  await page.locator(".search-form button").click();
  await act("category", '[data-category="民俗旧闻"]');
  assert.equal(await page.locator(".post-row").count(), 1);
  // Fresh mobile context: verify responsive layout without accidental overflow.
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto(url);
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await mobile.screenshot({
    path: path.join(out, "07-forum-mobile.png"),
    fullPage: true,
  });
  await mobile.locator('[data-action="post"][data-id="river"]').click();
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await mobile.locator('[data-action="collect"]').click();
  await mobile.locator('[data-action="help"]').click();
  await mobile.keyboard.press("Escape");
  assert.equal(await mobile.locator(".modal").count(), 0);
  // Verify loading the same static app from file:// (offline-compatible).
  const offline = await browser.newPage();
  offline.on("pageerror", (e) => errors.push(e.message));
  await offline.goto("file://" + path.resolve(__dirname, "../index.html"));
  assert.equal(await offline.locator(".post-row").count(), 6);
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "PASS: complete investigation, incorrect inputs, both endings, persistence, export, invalid import, search, filters, mobile and file://. No browser errors.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
