// Every drawing is well-formed, finite and safe, in both themes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { heroSkyline, card, badge, BADGES, activity, stats, calendarFacts, cover, ago, mix, langColor, social, THEMES } from '../scripts/render.mjs';
const THEME_ACCENT_BG = '#ddf4ff'; // the light theme's topic-chip background

const repo = { name: 'x', owner: 'u', title: 'A <b>"risky"</b> & title', blurb: 'Short blurb for the card, with an apostrophe’s worth of type.', lang: 'Rust', stars: 3, forks: 1, pushed: '2026-11-01T00:00:00Z', host: 'x.example.com', topics: ['a', 'b'], live: true, isNew: true };
const weeks = Array.from({ length: 53 }, (_, i) => ({ days: Array.from({ length: 7 }, (_, j) => ({ date: new Date(Date.UTC(2025, 10, 2 + i * 7 + j)).toISOString().slice(0, 10), count: (i * j) % 9 })) }));
const commits = [
  { repo: 'a', msg: 'first thing', at: '2026-11-04T00:00:00Z', sha: 'abcdef1234' },
  { repo: 'b', msg: 'second thing, which is long enough that it has to be cut off somewhere along the way home', at: '2026-11-03T00:00:00Z', sha: '1234567890' },
  { repo: 'a', msg: 'third', at: '2026-10-01T00:00:00Z', sha: 'fedcba9876' },
];
const now = new Date('2026-11-05T12:00:00Z');

const pieces = (theme) => ({
  heroSkyline: heroSkyline(theme, { weeks, total: 676 }),
  card: card(theme, repo, now),
  cardNoStars: card(theme, { ...repo, stars: 0, forks: 0 }, now),
  cardPicture: card(theme, { ...repo, image: { mime: 'image/jpeg', b64: 'AAAA' } }, now),
  badge: badge('LinkedIn', BADGES.LinkedIn),
  badgeUnknown: badge('Whatever', { icon: 'nope' }),
  activity: activity(theme, commits, now),
  stats: stats(theme, { contributions: 676, commits: 630, prs: 14, repos: 27, streak: 9, busiest: { count: 31, label: 'Oct 20' }, languages: [['TypeScript', 500], ['Rust', 200], ['Python', 100], ['Go', 50], ['C', 40], ['Swift', 30], ['Lua', 20], ['Other', 10]] }, 640),
  statsBare: stats(theme, { contributions: 0, commits: 0, prs: 0, repos: 0, languages: [] }),
});

for (const theme of ['light', 'dark']) {
  for (const [name, svg] of Object.entries(pieces(theme))) {
    test(`${theme} ${name}: well-formed XML, no NaN or undefined, one root svg`, () => {
      assert.equal(XMLValidator.validate(svg), true);
      assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
      assert.equal(new XMLParser({ ignoreAttributes: false }).parse(svg).svg['@_xmlns'], 'http://www.w3.org/2000/svg');
    });
  }
}

test('text is drawn as outlines: no <text> elements, so no font is ever needed', () => {
  for (const svg of Object.values(pieces('light'))) assert.doesNotMatch(svg, /<text[\s>]/);
});

test('nothing from outside gets in as markup: a title can’t add elements, scripts or handlers', () => {
  const svg = card('light', { ...repo, title: '<script>alert(1)</script><img onerror=x>' });
  assert.equal(XMLValidator.validate(svg), true);
  const tree = JSON.stringify(new XMLParser({ ignoreAttributes: false }).parse(svg));
  assert.doesNotMatch(tree, /"(script|img)":|"@_on\w+":/i); // no such element, no handler attribute
  assert.match(svg, /&lt;script&gt;/); // it's printed as text, escaped
});

test('every piece switches animation off for reduced motion', () => {
  for (const svg of Object.values(pieces('dark'))) assert.match(svg, /prefers-reduced-motion: reduce\)\{\*\{animation:none!important\}/);
});

test('motion ends on the finished picture: the towers rise once, nothing loops, nothing is held hidden', () => {
  for (const svg of Object.values(pieces('light'))) {
    assert.doesNotMatch(svg, /infinite|opacity:0[;}]|forwards|both/); // no loop to keep repainting; never ends invisible or collapsed
  }
  const sky = heroSkyline('light', { weeks, total: 1 });
  assert.match(sky, /@keyframes rise\{from\{transform:scaleY\(0\)\}\}/); // it states only where a rise starts: it ends on the drawn tower
});

test('the towers rise in slices, one per diagonal row, so only about sixty things animate rather than every tower', () => {
  const sky = heroSkyline('light', { weeks, total: 1 });
  const slices = (sky.match(/class="s"/g) || []).length;
  assert.ok(slices > 0 && slices <= weeks.length + 6, `${slices} slices`);
  const busy = weeks.flatMap((w) => w.days).filter((d) => d.count > 0).length;
  const towers = (sky.slice(sky.indexOf('class="s"')).match(/<polygon/g) || []).length / 3;
  assert.equal(towers, busy); // every busy day still has its tower (two sides and a top)
});

test('every day has ground to stand on, drawn once and never animated', () => {
  const sky = heroSkyline('dark', { weeks, total: 1 });
  const ground = sky.slice(0, sky.indexOf('class="s"'));
  assert.ok((ground.match(new RegExp(`fill="${THEMES.dark.contrib[0]}"`, 'g')) || []).length >= weeks.length * 7);
});

test('the cover is the same every time for the same name, and differs between names', () => {
  assert.equal(cover('light', 'claubi', 'Rust', 0, 0, 320, 200), cover('light', 'claubi', 'Rust', 0, 0, 320, 200));
  assert.notEqual(cover('light', 'claubi', 'Rust', 0, 0, 320, 200), cover('light', 'type', 'Rust', 0, 0, 320, 200));
});

test('the cover is tinted in the language’s own GitHub colour; unknown languages get a neutral one', () => {
  assert.equal(langColor('Rust'), '#dea584');
  assert.equal(langColor('Brainfuck'), '#8b949e');
  assert.equal(mix('#000000', '#ffffff', 0.5), '#808080');
});

test('ago reads like a person', () => {
  assert.equal(ago('2026-11-05T01:00:00Z', now), 'today');
  assert.equal(ago('2026-11-02T00:00:00Z', now), '3d ago');
  assert.equal(ago('2026-10-15T00:00:00Z', now), '3w ago');
  assert.equal(ago('2026-03-01T00:00:00Z', now), 'Mar 2026');
});

test('the streak and the busiest day come from the calendar', () => {
  const wk = (counts) => ({ days: counts.map((c, i) => ({ date: `2026-03-0${i + 1}`, count: c })) });
  const f = calendarFacts([wk([0, 2, 3, 0, 1, 1, 1]), wk([4, 0, 0, 0, 0, 0, 0])]);
  assert.equal(f.streak, 4); // 1, 1, 1 at the end of one week runs on into the 4 that starts the next
  assert.deepEqual(f.busiest, { count: 4, label: 'Mar 1' });
  assert.deepEqual(calendarFacts([wk([0, 0])]), { streak: 0, busiest: null });
});

test('the card is quiet: a picture, a name, a line about it, and a footer, with no labels or chips', () => {
  const svg = card('light', { ...repo, live: true, isNew: true, host: 'x.example.com', topics: ['a', 'b'] }, now);
  assert.doesNotMatch(svg, /rx="1[67]"[^>]*stroke="#(1a7f37|8250df)"/);
  assert.doesNotMatch(svg, new RegExp(THEME_ACCENT_BG));
});

test('a badge is one coloured picture with white lettering, the same on light and dark', () => {
  const svg = badge('Resume', BADGES.Resume);
  assert.match(svg, new RegExp(`fill="${BADGES.Resume.color}"`));
  assert.doesNotMatch(svg, /prefers-color-scheme/);
});

test('the share image is 1200 x 630, one picture, with no text elements', () => {
  const svg = social({ name: 'Tejal Goyal', handle: 'u', tagline: 'A tagline.', weeks });
  assert.equal(XMLValidator.validate(svg), true);
  assert.match(svg, /viewBox="0 0 1200 630"/);
  assert.doesNotMatch(svg, /<text[\s>]|NaN|undefined/);
});
