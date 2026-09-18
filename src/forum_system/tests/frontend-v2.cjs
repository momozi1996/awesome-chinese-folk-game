const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
const KEY = "weiming-lantern-save-v1",
  url = process.env.GAME_URL || "http://127.0.0.1:4173";
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      (fs.existsSync(
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      )
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : undefined),
  });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 960 },
    }),
    errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      /^https?:/.test(r.url()) &&
      new URL(r.url()).origin !== new URL(url).origin
    )
      external.push(r.url());
  });
  const act = async (a, s = "") =>
    page.locator(`[data-action="${a}"]${s}`).first().click();
  const nav = async (v) => act("nav", `[data-view="${v}"]`);
  const state = () =>
    page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY);
  const chatDone = async (contact, key) =>
    page.waitForFunction(
      ({ contact, key }) =>
        JSON.parse(localStorage.getItem("weiming-lantern-save-v1")).chats[
          contact
        ].includes(key),
      { contact, key },
    );
  const out = path.join(__dirname, "screenshots");
  fs.mkdirSync(out, { recursive: true });
  await page.goto(url);
  assert.equal(await page.locator(".sidebar,.right-sidebar").count(), 0);
  assert.equal(await page.locator('[data-action="ghost-message"]').count(), 0);
  assert.equal(await page.locator(".story-clock time").innerText(), "23:47");
  await page.screenshot({ path: path.resolve(__dirname, "../preview-v2.png") });
  const footer = await page.locator(".game-bottom").boundingBox();
  await page
    .locator("#content")
    .evaluate((e) => (e.scrollTop = e.scrollHeight));
  assert.deepEqual(await page.locator(".game-bottom").boundingBox(), footer);
  assert.equal(await page.evaluate(() => scrollY), 0);
  await act("post", '[data-id="river"]');
  await page.screenshot({ path: path.join(out, "v2-reading.png") });
  await act("collect", '[data-id="lamp"]');
  await nav("forum");
  assert.equal(await page.locator('[data-action="ghost-message"]').count(), 1);
  assert.match(await page.locator(".terminal-status").innerText(), /连接数：7/);
  await act("ghost-message");
  assert.match(await page.locator(".modal").innerText(), /已注销/);
  await page.screenshot({
    path: path.join(out, "v2-receipt.png"),
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".modal").count(), 0);
  assert.equal(
    await page.evaluate(() => document.activeElement.dataset.action),
    "ghost-message",
  );
  // Real delay, no duplicate dispatch, background arrival keeps the typed draft and caret.
  await nav("messages");
  await act("chat", '[data-key="hello"]');
  assert.equal((await state()).chats.north.includes("hello"), false);
  assert.equal(await page.locator(".typing-line").count(), 1);
  await page
    .locator('[data-action="chat"][data-key="hello"]')
    .dispatchEvent("click");
  await nav("forum");
  await act("post", '[data-id="river"]');
  await page.locator("#reply-input").fill("先别回复，我还在整理这盏灯。");
  await chatDone("north", "hello");
  assert.equal(
    (await state()).chats.north.filter((x) => x === "hello").length,
    1,
  );
  assert.equal(
    await page.locator("#reply-input").inputValue(),
    "先别回复，我还在整理这盏灯。",
  );
  assert.equal(
    await page.evaluate(() => document.activeElement.id),
    "reply-input",
  );
  assert.equal(
    await page.locator("#reply-input").evaluate((e) => e.selectionStart),
    "先别回复，我还在整理这盏灯。".length,
  );
  await page.locator('[data-form="reply"] button').click();
  assert.equal(await page.locator("#reply-input").inputValue(), "");
  // Modal remains modal even if a background chat finishes and re-renders the game.
  await nav("messages");
  await act("chat", '[data-key="safety"]');
  await act("settings");
  await chatDone("north", "safety");
  assert.equal(await page.locator("#app").evaluate((e) => e.inert), true);
  assert.equal(
    await page.evaluate(
      () => document.activeElement.closest(".modal") !== null,
    ),
    true,
  );
  await act("motion");
  assert.equal(await page.locator("#app").evaluate((e) => e.inert), true);
  assert.equal((await state()).motion, false);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#app").evaluate((e) => e.inert), false);
  assert.equal(
    await page.evaluate(() => document.activeElement.dataset.action),
    "settings",
  );
  await act("fullscreen");
  assert.equal(await page.evaluate(() => !!document.fullscreenElement), true);
  await act("fullscreen");
  // Import a v1-shaped save through the real confirmation flow, without changing its schema.
  const legacy = {
    version: 1,
    clues: [
      "lamp",
      "custom",
      "news",
      "address",
      "ledger",
      "tape",
      "paper",
      "survivor",
    ],
    links: ["purpose", "cause", "identity"],
    read: ["river"],
    chats: { north: ["hello", "archive"], rain: ["identity"] },
    notes: "旧版留下的批注。",
    motion: false,
    openedSafe: true,
    ending: null,
    endings: [],
  };
  await act("settings");
  await page.locator("#import-file").setInputFiles({
    name: "legacy-v1.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await page.locator("#confirm-import").waitFor({ state: "visible" });
  assert.match(await page.locator(".modal").innerText(), /载入这份存档/);
  await page.locator("#confirm-import").click();
  assert.equal((await state()).clues.length, 8);
  assert.equal((await state()).links.length, 3);
  assert.equal(
    await page.locator("#personal-notes").inputValue(),
    legacy.notes,
  );
  assert.equal(await page.locator(".story-clock time").innerText(), "00:16");
  assert.match(
    await page.locator(".story-clock small").innerText(),
    /二十二日/,
  );
  await nav("messages");
  await page.screenshot({ path: path.join(out, "v2-chat.png") });
  await page.reload();
  await nav("board");
  assert.equal(
    await page.locator("#personal-notes").inputValue(),
    legacy.notes,
  );
  await page.screenshot({ path: path.join(out, "v2-dossier.png") });
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await mobile.goto(url);
  for (const name of ["调查玩法与提示", "设置与存档", "开启环境音", "切换全屏"])
    assert.equal(
      await mobile.getByRole("button", { name, exact: true }).count(),
      1,
    );
  await mobile.screenshot({ path: path.join(out, "v2-mobile.png") });
  // Every shipped resource is local. Offline mode loads the original scene as well as the forum.
  const offline = await browser.newPage();
  offline.on("pageerror", (e) => errors.push(e.message));
  await offline.context().setOffline(true);
  await offline.goto("file://" + path.resolve(__dirname, "../index.html"));
  assert.equal(await offline.locator(".post-row").count(), 6);
  await offline.evaluate(
    ({ key, legacy }) => localStorage.setItem(key, JSON.stringify(legacy)),
    { key: KEY, legacy },
  );
  await offline.reload();
  await offline.locator('[data-action="nav"][data-view="scene"]').click();
  assert.ok(
    await offline
      .locator(".scene-photo")
      .evaluate((e) => e.complete && e.naturalWidth > 0),
  );
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "PASS: v2 story receipt/time, anchored viewport, delayed replies, duplicate guard, draft/focus preservation, modal isolation, full screen, v1 import, mobile labels, and offline scene.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
