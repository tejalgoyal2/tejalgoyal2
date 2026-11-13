// The README reads like a README: plain links, the same thing never said twice, nothing hidden in a picture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readme } from '../scripts/readme.mjs';

const config = {
  user: 'u', name: 'Tejal Goyal', site: 'https://tgoyal.me',
  about: 'Software engineer. I build agents that talk to real systems, pipelines that hold up, and small things that are fun to use.',
  links: { Portfolio: 'https://tgoyal.me', Blog: 'https://b.example', LinkedIn: 'https://l.example', Resume: 'https://tgoyal.me/resume.pdf' },
};
const d = (name, o = {}) => ({ name, title: name, blurb: `What ${name} does, in a line.`, lang: 'Rust', stars: 0, pushed: '2026-11-01T00:00:00Z', repoUrl: `https://github.com/u/${name}`, ...o });
const now = new Date('2026-11-05T12:00:00Z');
const md = readme({ config, now, leads: [d('a'), d('b', { blurb: 'A & B <tag>' })], fresh: [d('c')], wire: [], calendar: { total: 700, commits: 600, prs: 3, weeks: [] }, hasStats: false, hasActivity: false });

test('the links are small badges that open the right places', () => {
  for (const [k, url] of Object.entries(config.links)) assert.match(md, new RegExp(`<a href="${url.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')}"><img alt="${k}" src="edition/link-${k.toLowerCase()}\\.svg" height="32"></a>`));
});

test('who I am is said once: no tagline panel beside the intro', () => {
  assert.equal(md.split('I build agents that talk').length, 2);
  assert.doesNotMatch(md, /hero-profile/);
});

test('the page is the skyline, the intro, the links and the projects: no extra sections', () => {
  assert.deepEqual([...md.matchAll(/^## (.+)$/gm)].map((m) => m[1]), ['Projects']);
  assert.doesNotMatch(md, /For language models|## More|## Writing|llms\.txt/);
});

test('each project is one plain line: its name, linked to the repository, and what it is', () => {
  assert.match(md, /^- \*\*\[a\]\(https:\/\/github\.com\/u\/a\)\*\*: What a does, in a line\.$/m);
  assert.equal((md.match(/^- \*\*\[/gm) || []).length, 3);
  assert.doesNotMatch(md, /edition\/card-/); // no picture cards
});

test('text from other sites can’t add markup', () => {
  assert.match(md, /A &amp; B &lt;tag>/);
});
