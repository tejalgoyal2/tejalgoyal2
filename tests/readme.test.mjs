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
const md = readme({ config, now, leads: [d('a'), d('b', { stars: 2 })], fresh: [d('c')], brief: [d('m', { blurb: 'A & B <tag>' })], wire: [], calendar: { total: 700, commits: 600, prs: 3, weeks: [] }, posts: [{ title: 'Post', url: 'https://b.example/p', date: '2026-06-08' }], hasStats: false, hasActivity: false });

test('the links are an ordinary line of links, not pictures', () => {
  assert.match(md, /\[Portfolio\]\(https:\/\/tgoyal\.me\) · .*\[Blog\]\(https:\/\/b\.example\) · .*\[LinkedIn\].* · .*\[Resume\]/);
  assert.doesNotMatch(md, /edition\/link-/);
});

test('who I am is said once: no tagline panel beside the intro', () => {
  assert.equal(md.split('I build agents that talk').length, 2);
  assert.doesNotMatch(md, /hero-profile/);
});

test('each project is a thumbnail and a linked name with its line, and the name goes to the repository', () => {
  assert.equal((md.match(/<br clear="left">/g) || []).length, 3);
  assert.match(md, /<b><a href="https:\/\/github\.com\/u\/a">a<\/a><\/b><br>\nWhat a does, in a line\.<br>\n<sub>Rust · updated 4d ago<\/sub>/);
  assert.match(md, /★ 2/);
  assert.doesNotMatch(md, /edition\/card-|live at|Opens the repository/);
});

test('the thumbnail’s description doesn’t repeat the words beside it', () => {
  const alts = [...md.matchAll(/alt="([^"]*)"/g)].map((m) => m[1]);
  for (const alt of alts.filter((x) => /preview/.test(x))) assert.doesNotMatch(alt, /does, in a line/);
});

test('text from other sites can’t add markup', () => {
  assert.match(md, /A & B \\<tag\\>/); // the brackets are escaped, so it prints as text
  assert.doesNotMatch(md, /[^\\]<tag>/);
});
