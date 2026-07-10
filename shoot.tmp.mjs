import { chromium } from "playwright";

const OUT = process.argv[2] || ".";
const browser = await chromium.launch();
const page = await browser.newPage({ viewportSize: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 400)));

await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForFunction(
  () => !document.body.innerText.includes("LOADING / BRAND OS"),
  null,
  { timeout: 20000 },
);
// let hero entrance + cards finish; nudge mouse for parallax
await page.mouse.move(1000, 350);
await page.waitForTimeout(2800);
await page.screenshot({ path: `${OUT}/20-hero-dark.png` });

const scrollTo = async (y) => {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
  await page.waitForTimeout(1300);
};
const topOf = (sel) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.getBoundingClientRect().top + window.scrollY : 0;
  }, sel);

// dark marquee band between hero and assembly
const band1 = await topOf("#band1");
await scrollTo(band1 - 300);
await page.screenshot({ path: `${OUT}/21-dark-band.png` });

// assembly: mid-pin (dark, exploded->locked), end-of-pin (light flooding)
const howTop = await topOf("#how");
await scrollTo(howTop + 700);
await page.screenshot({ path: `${OUT}/22-assembly-mid.png` });
await scrollTo(howTop + 1250);
await page.screenshot({ path: `${OUT}/23-assembly-locked-dark.png` });
await scrollTo(howTop + 1480);
await page.screenshot({ path: `${OUT}/24-light-flood.png` });

// showcase strip should be fully paper
const exTop = await topOf("#example");
await scrollTo(exTop + 1400);
await page.screenshot({ path: `${OUT}/25-strip-mid.png` });

console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "no page errors");
await browser.close();
