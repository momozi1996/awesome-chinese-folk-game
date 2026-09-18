const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
const url = process.env.GAME_URL || "http://127.0.0.1:4173";
const snapshot = async (p, view) =>
  p.evaluate((view) => {
    const content = document.getElementById("content"),
      r = content.getBoundingClientRect();
    const controls = [
      ...document.querySelectorAll(".nav-link,.game-utilities button"),
    ];
    const fits = controls.every((e) => {
      const b = e.getBoundingClientRect();
      return (
        b.x >= 0 && b.y >= 0 && b.right <= innerWidth && b.bottom <= innerHeight
      );
    });
    const clickable = controls.every((e) => {
      const b = e.getBoundingClientRect();
      return e.contains(
        document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2),
      );
    });
    const scene = document.querySelector(".scene-frame"),
      s = scene?.getBoundingClientRect();
    const hotspots =
      !scene ||
      [...document.querySelectorAll(".hotspot")].every((e) => {
        const b = e.getBoundingClientRect();
        return (
          b.left >= s.left &&
          b.right <= s.right &&
          b.top >= s.top &&
          b.bottom <= s.bottom
        );
      });
    return {
      width: innerWidth,
      height: innerHeight,
      view,
      overflow: content.scrollWidth - content.clientWidth,
      documentOverflow: document.documentElement.scrollWidth - innerWidth,
      controlsFit: fits,
      controlsClickable: clickable,
      hotspotsFit: hotspots,
      contentFits: r.top >= 0 && r.bottom <= innerHeight,
      documentScroll: scrollY,
    };
  }, view);
(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      (fs.existsSync(
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      )
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : undefined),
  });
  const results = [],
    errors = [];
  const out = path.join(__dirname, "screenshots");
  fs.mkdirSync(out, { recursive: true });
  for (const [width, height] of [
    [320, 640],
    [375, 812],
    [390, 844],
    [768, 900],
    [1024, 768],
    [1440, 720],
    [1920, 1080],
    [844, 390],
  ]) {
    const p = await b.newPage({ viewport: { width, height } });
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(url);
    results.push(await snapshot(p, "forum"));
    if (width === 1440)
      await p.screenshot({ path: path.join(out, "v2-short-desktop.png") });
    await p.evaluate(() =>
      localStorage.setItem(
        "weiming-lantern-save-v1",
        JSON.stringify({
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
          links: [],
          chats: {
            north: ["hello", "archive", "safety"],
            rain: ["hello", "identity", "lantern"],
          },
          motion: false,
        }),
      ),
    );
    await p.reload();
    for (const view of ["scene", "messages", "board"]) {
      await p.locator(`.nav-link[data-view="${view}"]`).click();
      results.push(await snapshot(p, view));
      if (width === 390)
        await p.screenshot({ path: path.join(out, `v2-mobile-${view}.png`) });
      if (width === 1920 && view === "scene")
        await p.screenshot({ path: path.join(out, "v2-wide-scene.png") });
    }
    await p.locator('.nav-link[data-view="forum"]').click();
    await p.locator('[data-action="post"][data-id="river"]').click();
    results.push(await snapshot(p, "post"));
    await p.locator('[data-action="settings"]').click();
    const modalOK = await p.locator(".modal").evaluate((e) => {
      const r = e.getBoundingClientRect();
      return (
        r.x >= 0 &&
        r.right <= innerWidth &&
        r.top >= 0 &&
        r.bottom <= innerHeight &&
        e.scrollWidth <= e.clientWidth
      );
    });
    assert.ok(modalOK, `Settings dialog overflows ${width}x${height}`);
    await p.close();
  }
  console.table(results);
  assert.deepEqual(errors, []);
  assert.ok(
    results.every(
      (r) =>
        r.overflow <= 1 &&
        r.documentOverflow <= 0 &&
        r.controlsFit &&
        r.controlsClickable &&
        r.hotspotsFit &&
        r.contentFits &&
        r.documentScroll === 0,
    ),
    "Viewport, controls or inner scrolling failed",
  );
  fs.writeFileSync(
    path.join(__dirname, "responsive-results.json"),
    JSON.stringify(results, null, 2),
  );
  await b.close();
  console.log(
    "PASS: 40 game views + 8 settings dialogs; anchored controls, inner scroll, hotspots and viewport bounds.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
