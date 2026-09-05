/**
 * Drives the app in a real browser and screenshots each step.
 *
 * Verifying UI by exporting and looking at it catches what a green typecheck
 * never will: layout that overflows, text that wraps badly, a CTA below the
 * fold, a screen that renders blank because a selector threw.
 *
 * Usage:
 *   npx expo export --platform web --output-dir .web
 *   node scripts/walkthrough.mjs .web ./shots [flowName]
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ?? '.web';
const outDir = process.argv[3] ?? './shots';
const flowName = process.argv[4] ?? 'onboarding';

const MIME = {
  '.js': 'text/javascript',
  '.html': 'text/html',
  '.css': 'text/css',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.ttf': 'font/ttf',
};

/** Click the first element whose visible text matches exactly. */
const tap = (text) => ({ tap: text });
/** Screenshot under this name. */
const shot = (name) => ({ shot: name });
/** Type into a field by testID. */
const type = (testId, text) => ({ type: { testId, text } });
/** Tap by testID, for controls whose label changes. */
const tapId = (testId) => ({ tapId: testId });

const FLOWS = {
  onboarding: [
    shot('01-cold-open'),
    tap('Start'),
    shot('02-what-rules-you'),
    tap('Anger'),
    shot('03-depth'),
    tap('At work'),
    tap('Most days'),
    shot('05-cost'),
    tap('Sleep'),
    tap('Meditation apps'),
    shot('07-differentiation'),
    tap('Go on'),
    shot('08-minutes'),
    tap('5 minutes'),
    shot('09-plan-reveal'),
    tap('Continue'),
    shot('10-timeline'),
    tap('Continue'),
    shot('11-commit'),
    tap('9pm'),
    shot('12-handoff'),
    tap('Begin training'),
    shot('13-today'),
  ],

  full: [
    // Onboarding, compressed: covered in detail by the `onboarding` flow.
    tap('Start'),
    tap('Anger'),
    tap('At work'),
    tap('Most days'),
    tap('Sleep'),
    tap('Meditation apps'),
    tap('Go on'),
    tap('5 minutes'),
    tap('Continue'),
    tap('Continue'),
    tap('9pm'),
    tap('Begin training'),

    // Lesson one.
    tap('Start lesson'),
    shot('20-lesson-hook'),
    tap('Go on'),
    shot('21-lesson-concept'),
    tap('Continue'),
    shot('22-lesson-quote'),
    tap('Continue'),
    shot('23-lesson-sort'),
    tap('Up to me'),
    tap('Not up to me'),
    tap('Up to me'),
    tap('Not up to me'),
    tap('Up to me'),
    tap('Not up to me'),
    shot('24-lesson-sort-done'),
    tap('Continue'),
    shot('25-lesson-rep'),
    tap('How you respond, and what you do with the part that was fair.'),
    shot('26-lesson-rep-feedback'),
    tap('Continue'),
    shot('27-lesson-carry'),
    tap('I will stop arguing with one thing I cannot change.'),
    tap('Set intention and finish'),
    shot('28-today-after-lesson'),

    // The Arena: three compounding rounds.
    tapId('today-cta'),
    shot('30-spar-instinct'),
    tapId('instinct-0'),
    tap('Now the trained response'),
    shot('31-spar-round1'),
    type('round-input', 'What he said is not mine to control. My part is how I respond, and I can raise the attribution afterwards in writing rather than in the room.'),
    tapId('submit-round'),
    shot('32-spar-round2'),
    type('round-input', 'Still not mine. I noticed I want the credit more than I want the work to be right, and that is the bit I can actually work on.'),
    tapId('submit-round'),
    shot('33-spar-round3'),
    type('round-input', 'Same answer. It is not in my power what he does. My part is the record, and I will handle it without heat.'),
    tapId('submit-round'),
    shot('34-verdict'),
    tapId('verdict-done'),
    shot('35-after-verdict'),

    // The Quench.
    tapId('today-cta'),
    shot('40-quench-intention'),
    tap('Sort of'),
    tap('Next'),
    shot('41-quench-held'),
    tap('Paused before reacting'),
    tap('Next'),
    shot('42-quench-ran'),
    tap('Took something personally'),
    tap('Next'),
    shot('43-quench-context'),
    tap('Afternoon'),
    tap('Work'),
    tap('Seal the day'),
    shot('44-quench-seal'),
    tapId('quench-done'),

    // The remaining surfaces.
    tap('Train'),
    shot('50-train'),
    tap('Pattern'),
    shot('51-pattern'),
    tap('Timeline'),
    shot('52-pattern-timeline'),
    tap('Arena'),
    shot('53-arena'),
  ],
};

function findChromium() {
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!base || !fs.existsSync(base)) return undefined;
  for (const dir of fs.readdirSync(base)) {
    if (!dir.startsWith('chromium-')) continue;
    const exe = path.join(base, dir, 'chrome-linux', 'chrome');
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(root, url);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(4173, r));

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: findChromium() });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

// Each run must start from a clean slate, or the onboarding gate redirects
// straight past the flow we are trying to capture.
await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => { try { localStorage.clear(); } catch {} });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

let failed = false;
for (const step of FLOWS[flowName] ?? []) {
  if (step.shot) {
    await page.screenshot({ path: path.join(outDir, `${step.shot}.png`) });
    console.log(`  shot  ${step.shot}`);
    continue;
  }

  const label =
    step.tap ?? step.tapId ?? (step.type ? `type into ${step.type.testId}` : 'unknown');
  // Screens under a modal stay mounted but hidden, so an unscoped `.first()`
  // resolves to the stale copy underneath and then waits forever for it to
  // become visible. Every lookup is scoped to visible elements.
  const visible = (locator) => locator.locator('visible=true').first();
  const target = step.tap
    ? visible(page.getByText(step.tap, { exact: true }))
    : step.tapId
      ? visible(page.getByTestId(step.tapId))
      : visible(page.getByTestId(step.type.testId));

  try {
    await target.waitFor({ state: 'visible', timeout: 5000 });
    if (step.type) {
      await target.fill(step.type.text);
      await page.waitForTimeout(150);
      console.log(`  type  ${step.type.testId}`);
    } else {
      await target.click();
      // Sort cards hold their feedback state briefly before advancing.
      await page.waitForTimeout(800);
      console.log(`  tap   ${label}`);
    }
  } catch (err) {
    console.error(`  FAIL  ${label}: ${String(err).split('\n')[0]}`);
    await page.screenshot({ path: path.join(outDir, `FAIL-${label.replace(/\W+/g, '-').slice(0, 40)}.png`) });
    failed = true;
    break;
  }
}

const unique = [...new Set(errors)];
console.log(unique.length ? `\nPAGE ERRORS:\n${unique.join('\n')}` : '\nno page errors');

await browser.close();
server.close();
process.exit(failed || unique.length > 0 ? 1 : 0);
