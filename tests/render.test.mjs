// Every drawing is well-formed, finite and safe, in both themes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { hero, card, activity, stats, cover, ago, mix, langColor } from '../scripts/render.mjs';

const repo = { name: 'x', owner: 'u', title: 'A <b>"risky"</b> & title', blurb: 'Short blurb for the card, with an apostrophe’s worth of type.', lang: 'Rust', stars: 3, forks: 1, pushed: '2026-11-01T00:00:00Z', host: 'x.example.com', topics: ['a', 'b'], live: true, isNew: true };
const weeks = Array.from({ length: 53 }, (_, i) => ({ days: Array.from({ length: 7 }, (_, j) => ({ date: new Date(Date.UTC(2025, 10, 2 + i * 7 + j)).toISOString().slice(0, 10), count: (i * j) % 9 })) }));
const commits = [
  { repo: 'a', msg: 'first thing', at: '2026-11-04T00:00:00Z', sha: 'abcdef1234' },
  { repo: 'b', msg: 'second thing, which is long enough that it has to be cut off somewhere along the way home', at: '2026-11-03T00:00:00Z', sha: '1234567890' },
  { repo: 'a', msg: 'third', at: '2026-10-01T00:00:00Z', sha: 'fedcba9876' },
];
const now = new Date('2026-11-05T12:00:00Z');
const pieces = (theme) => ({
  hero: hero(theme, { name: 'Tejal Goyal', handle: 'u', tagline: 'A tagline that wraps onto a second line or even a third if it must.', chips: ['One', 'Two', 'Three'], weeks, total: 676, last: commits[0] }, now),
  heroBare: hero(theme, { name: 'Tejal Goyal', handle: 'u', tagline: 'No data.', chips: [], weeks: null, last: null }, now),
  card: card(theme, repo, now),
  cardNoImageNoTopics: card(theme, { ...repo, topics: [], host: '', live: false, isNew: false, stars: 0, forks: 0 }, now),
  activity: activity(theme, commits, now),
  stats: stats(theme, { contributions: 676, commits: 630, prs: 14, repos: 27, languages: [['TypeScript', 500], ['Rust', 200], ['Python', 100]] }),
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

test('animation only ever dips away from the finished picture, so a paused one is still complete', () => {
  // no keyframe may start from an invisible or collapsed state (a "pop in" would leave a blank graph if it never ran)
  for (const svg of Object.values(pieces('light'))) assert.doesNotMatch(svg, /from\{[^}]*(opacity:0|scale\(0\))/);
});

test('the hero draws one bar group per day with something in it', () => {
  const bars = (pieces('light').hero.match(/class="w"/g) || []).length;
  const busy = weeks.flatMap((w) => w.days).filter((d) => d.count > 0).length;
  assert.equal(bars, busy);
});

test('the cover is the same every time for the same name, and differs between names', () => {
  assert.equal(cover('light', 'claubi', 'Rust', 0, 0, 800, 300), cover('light', 'claubi', 'Rust', 0, 0, 800, 300));
  assert.notEqual(cover('light', 'claubi', 'Rust', 0, 0, 800, 300), cover('light', 'type', 'Rust', 0, 0, 800, 300));
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
