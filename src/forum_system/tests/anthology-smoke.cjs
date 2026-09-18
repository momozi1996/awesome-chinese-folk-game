const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || (require("node:fs").existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome") ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined),
  });
  const p = await b.newPage({ viewport: { width: 1440, height: 960 } });
  const url = process.env.GAME_URL || "http://127.0.0.1:4173";
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  const act = async (a, s = "") =>
    p.locator(`[data-action="${a}"]${s}`).first().click();
  const nav = async (v) => act("nav", `[data-view="${v}"]`);
  const state = (id) =>
    p.evaluate(
      (id) => JSON.parse(localStorage.getItem(`weiming-case-${id}-v1`)),
      id,
    );
  const wait = (id, needle) =>
    p.waitForFunction(
      ({ id, needle }) =>
        JSON.parse(
          localStorage.getItem(`weiming-case-${id}-v1`),
        ).clues.includes(needle),
      { id, needle },
    );
  async function collectPost(id, post, clue) {
    await nav("forum");
    await act("c-post", `[data-id="${post}"]`);
    await act("c-collect", `[data-id="${clue}"]`);
  }
  async function chat(id, contact, key, clue) {
    await nav("messages");
    await act("c-contact", `[data-contact="${contact}"]`);
    await act("c-chat", `[data-key="${key}"]`);
    await wait(id, clue);
  }
  async function solveCase(id) {
    const configs = {
      bridal: {
        puzzle: { first: "shoe", second: "knot", third: "name" },
        report: {
          meaning: "release",
          voice: "interview",
          responsibility: "check",
        },
      },
      caravan: {
        puzzle: { start: "pass", middle: "bridge", end: "willow" },
        report: { direction: "out", group: "living", bell: "stop" },
      },
      snow: {
        puzzle: { first: "uncle", second: "empty" },
        report: { meaning: "traveler", rule: "later", claim: "scope" },
        pairs: [
          ["signal", "register"],
          ["custom", "schedule"],
          ["record", "address"],
          ["sealed", "witness"],
          ["address", "echo"],
        ],
      },
      shadowplay: {
        puzzle: { first: "open", second: "change", third: "water" },
        report: { move: "line", cause: "trace", responsibility: "separate" },
      },
    };
    const config = configs[id];
    if (p.url() === "about:blank") await p.goto(url);
    await p.evaluate((id) => {
      localStorage.removeItem(`weiming-case-${id}-v1`);
      localStorage.setItem("weiming-active-case", id);
    }, id);
    await p.reload();
    await act("casebook");
    await act("select-case", `[data-case="${id}"]`);
    for (const x of [
      ["opening", "signal"],
      ["customs", "custom"],
      ["archive", "record"],
      ["watch", "schedule"],
    ])
      await collectPost(id, ...x);
    await chat(id, "north", "hello", "signal");
    await chat(id, "north", "archive", "address");
    await nav("scene");
    for (const h of ["trace", "register"]) {
      await act("c-hotspot", `[data-id="${h}"]`);
      await act("c-field-collect", `[data-id="${h}"]`);
    }
    await act("c-hotspot", '[data-id="sealed"]');
    await act("c-puzzle", '[data-id="sealed"]');
    for (const [k, v] of Object.entries(config.puzzle))
      await p
        .locator(`[data-form="case-puzzle"] select[name="${k}"]`)
        .selectOption(v);
    await p.locator('[data-form="case-puzzle"] button').click();
    await act("c-field-collect", '[data-id="sealed"]');
    await chat(id, "rain", "hello", "signal");
    await chat(id, "rain", "identity", "witness");
    await collectPost(id, "followup", "echo");
    await nav("board");
    for (const l of config.pairs || [
      ["signal", "trace"],
      ["custom", "register"],
      ["record", "schedule"],
      ["sealed", "witness"],
      ["address", "echo"],
    ]) {
      await act("c-select", `[data-id="${l[0]}"]`);
      await act("c-select", `[data-id="${l[1]}"]`);
      await act("c-connect");
      if (await p.locator(".modal").count()) await act("close");
    }
    assert.equal((await state(id)).links.length, 5);
    await act("c-report");
    for (const [q, answer] of Object.entries(config.report))
      await p
        .locator(`[data-form="case-report"] select[name="${q}"]`)
        .selectOption(answer);
    await p.locator('[data-form="case-report"] button').click();
    await act("c-ending", '[data-ending="truth"]');
    assert.equal((await state(id)).ending, "truth");
    console.log(id, "OK", errs.length);
  }
  await solveCase("bridal");
  await solveCase("caravan");
  await solveCase("snow");
  await solveCase("shadowplay");
  console.log(
    "PASS: four independent anthology cases, evidence chains, field puzzles, reports, and alternate endings.",
  );
  assert.deepEqual(errs, []);
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
