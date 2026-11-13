// The picture for each project. In order of preference:
//   1. the project's own share image (its og:image), because it was designed on purpose;
//   2. a screenshot of the live site, taken in headless Chromium;
//   3. nothing: the thumbnail draws the repo's commits as towers of blocks instead (scripts/render.mjs).
// config.repos.<name>.preview can force "og", "shot" or "cover".
//
// Pictures are stored in assets/shots/<repo>.jpg and only replaced when they have visibly
// changed, so a weekly run doesn't commit a new file every time a page's clock ticks.
// Whatever is fetched is re-encoded as a plain JPEG here: nothing from another site is ever
// embedded as-is.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const W = 1200, H = 750; // a thumbnail's picture (8:5), kept large so it can be redrawn smaller
const UA = 'tejalgoyal2-profile-edition (+https://github.com/tejalgoyal2/tejalgoyal2)';

const toJpeg = (input, position) =>
  sharp(input, { limitInputPixels: 40_000_000 })
    .resize(W, H, { fit: 'cover', position })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 74, mozjpeg: true })
    .toBuffer();

/** How different two pictures look: mean gray difference of 32x14 thumbnails, 0-255. */
async function difference(a, b) {
  const thumb = (x) => sharp(x).resize(32, 20, { fit: 'fill' }).greyscale().raw().toBuffer();
  const [ta, tb] = await Promise.all([thumb(a), thumb(b)]);
  let sum = 0;
  for (let i = 0; i < ta.length; i++) sum += Math.abs(ta[i] - tb[i]);
  return sum / ta.length;
}

async function fromOg(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok || !(res.headers.get('content-type') || '').startsWith('image/') || /svg/.test(res.headers.get('content-type'))) throw new Error(`og image ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 8_000_000) throw new Error('og image too large');
  // only plain raster formats are ever decoded: no SVG, no HEIF
  const { format } = await sharp(buf, { limitInputPixels: 40_000_000 }).metadata();
  if (!['jpeg', 'png', 'webp', 'gif'].includes(format)) throw new Error(`og image is ${format}, not a plain raster`);
  return toJpeg(buf, 'north');
}

async function fromShot(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference', colorScheme: 'light' });
  try {
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load', timeout: 25_000 });
    await page.waitForTimeout(3500);
    return toJpeg(await page.screenshot({ type: 'png' }), 'north');
  } finally {
    await ctx.close();
  }
}

/**
 * @returns {Promise<{ mime:string, b64:string, source:'og'|'shot'|'kept' } | null>}
 */
export async function preview({ repo, d, probe, shotsDir, browser, log = () => {}, readOnly = false }) {
  const file = path.join(shotsDir, `${repo}.jpg`);
  const existing = fs.existsSync(file) ? fs.readFileSync(file) : null;
  const done = (buf, source) => ({ mime: 'image/jpeg', b64: buf.toString('base64'), source });
  if (d.preview === 'cover') return null;
  if (readOnly) return existing ? done(existing, 'kept') : null;

  let fresh = null, source = '';
  try {
    if (d.preview !== 'shot' && probe?.ogImage) (fresh = await fromOg(probe.ogImage)), (source = 'og');
  } catch (e) {
    log(`  ! ${repo}: og image: ${e.message}`);
  }
  if (!fresh && d.preview !== 'og' && probe?.up && d.homepage && browser) {
    try {
      (fresh = await fromShot(browser, d.homepage)), (source = 'shot');
    } catch (e) {
      log(`  ! ${repo}: screenshot: ${e.message}`);
    }
  }
  if (!fresh) return existing ? done(existing, 'kept') : null;

  const shaped = existing && (await sharp(existing).metadata()).height === H; // an older, differently shaped file is replaced
  if (shaped && (await difference(existing, fresh)) < 3) return done(existing, 'kept'); // same picture
  fs.mkdirSync(shotsDir, { recursive: true });
  fs.writeFileSync(file, fresh);
  log(`  + ${repo}: new ${source} picture`);
  return done(fresh, source);
}
