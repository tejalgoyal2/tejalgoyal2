// The rules for who goes where on the front page, and the small pure helpers around them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { select, describe } from '../scripts/select.mjs';
import { worthShowing } from '../scripts/collect.mjs';
import { wrap, measure } from '../scripts/type.mjs';

const now = new Date('2026-11-05T12:00:00Z');
const daysAgo = (n) => new Date(now - n * 864e5).toISOString();
const repo = (name, o = {}) => ({ name, description: 'something', homepage: '', language: 'JS', topics: [], stars: 0, fork: false, archived: false, private: false, created: daysAgo(400), pushed: daysAgo(100), url: `https://github.com/u/${name}`, ...o });
const config = { user: 'u', lead: ['b', 'a', 'gone'], hide: ['hidden'], freshDays: 45, freshMax: 2, repos: {} };

test('leads come in the order the config names them; unknown ones are reported', () => {
  const s = select({ repos: [repo('a'), repo('b')], config, now });
  assert.deepEqual(s.leads.map((r) => r.name), ['b', 'a']);
  assert.deepEqual(s.missingLeads, ['gone']);
});

test('forks, archives, private repos, hidden repos, the profile repo and coursework never show', () => {
  const s = select({
    repos: [repo('f', { fork: true }), repo('ar', { archived: true }), repo('p', { private: true }), repo('hidden'), repo('u'), repo('skills-intro'), repo('introduction-to-github'), repo('ok')],
    config: { ...config, lead: [] }, now,
  });
  assert.deepEqual(s.brief.map((r) => r.name), ['ok']);
});

test('a recently pushed repo is found by itself, newest first, up to freshMax', () => {
  const s = select({ repos: [repo('old'), repo('n1', { pushed: daysAgo(3) }), repo('n2', { pushed: daysAgo(1) }), repo('n3', { pushed: daysAgo(10) })], config: { ...config, lead: [] }, now });
  assert.deepEqual(s.fresh.map((r) => r.name), ['n2', 'n1']);
  assert.deepEqual(s.brief.map((r) => r.name), ['n3', 'old']);
});

test('a repo with nothing to say stays out and is named; a config blurb brings it in', () => {
  const bare = repo('bare', { description: '' });
  assert.deepEqual(select({ repos: [bare], config: { ...config, lead: [] }, now }).silent, ['bare']);
  const s = select({ repos: [bare], config: { ...config, lead: [], repos: { bare: { blurb: 'hi' } } }, now });
  assert.deepEqual(s.brief.map((r) => r.name), ['bare']);
});

test('the site’s own words win, then the config, then GitHub’s description', () => {
  const r = repo('x', { description: 'github says' });
  assert.equal(describe(r, { config: { repos: {} }, site: {} }).blurb, 'github says');
  assert.equal(describe(r, { config: { repos: { x: { blurb: 'config says' } } }, site: {} }).blurb, 'config says');
  assert.equal(describe(r, { config: { repos: { x: { blurb: 'config says' } } }, site: { x: { name: 'X', description: 'site says', status: 'LIVE' } } }).blurb, 'site says');
});

test('a repo created in the last 45 days is new; one with a live site is live', () => {
  const o = { config: { repos: {} }, site: {}, now };
  assert.equal(describe(repo('x', { created: daysAgo(5) }), { ...o, probe: { up: true, host: 'x.dev' } }).isNew, true);
  assert.equal(describe(repo('x', { created: daysAgo(500) }), { ...o, probe: { up: true, host: 'x.dev' } }).isNew, false);
  assert.equal(describe(repo('x'), { ...o, probe: { up: true, host: 'x.dev' } }).live, true);
  assert.equal(describe(repo('x'), { ...o }).live, false);
});

test('robots’ commits and merges stay off the wire', () => {
  assert.equal(worthShowing('Update blog posts'), null);
  assert.equal(worthShowing('Merge pull request #4 from x'), null);
  assert.equal(worthShowing('Adding a new resume.pdf'), null);
  assert.equal(worthShowing('Rename resume.pdf to resume_old.pdf'), null);
  assert.equal(worthShowing('Add resume parsing to the screener'), 'Add resume parsing to the screener');
  assert.equal(worthShowing('fix the scoreboard\n\nlong body'), 'fix the scoreboard');
});

test('wrapping never overflows, and cuts with an ellipsis', () => {
  const text = 'An expense tracker you text like a friend. It reads plain English and Hinglish, files it, and has opinions about every single purchase.';
  const lines = wrap('text', text, 25, 400, 2);
  assert.equal(lines.length, 2);
  assert.ok(lines.every((l) => measure('text', l, 25) <= 400));
  assert.ok(lines[1].endsWith('…'));
});
