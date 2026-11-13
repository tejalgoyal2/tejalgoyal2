// Prints the edition: collect → choose → draw → write README.md and edition/*.svg.
//
//   node scripts/build.mjs               everything, fresh (needs GITHUB_TOKEN, or `gh auth login` locally)
//   node scripts/build.mjs --cached      redraw from .cache/data.json and the saved pictures (no network)
//   node scripts/build.mjs --private     include private repos (local runs only; never on a public profile)
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { collect } from './collect.mjs';
import { select, describe } from './select.mjs';
import { heroSkyline, card, blurbLines, badge, BADGES, activity, activityHeight, stats, calendarFacts, social } from './render.mjs';
import { readme, cardFile, linkFile } from './readme.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const cached = args.has('--cached');
const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
const log = (...a) => console.log(...a);
const now = new Date();

const token =
  process.env.PROFILE_TOKEN ||
  process.env.GITHUB_TOKEN ||
  (() => {
    try {
      return execSync('gh auth token', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      return '';
    }
  })();

const cacheFile = path.join(root, '.cache', 'data.json');
let data;
if (cached) {
  data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  log(`using cached data from ${data.collectedAt}`);
} else {
  log('collecting…');
  data = await collect(config, { token, publicOnly: !args.has('--private'), log });
}

const sel = select({ repos: data.repos, config, now });
const shown = [...sel.leads, ...sel.fresh];
log(`featured ${sel.leads.length} · recent ${sel.fresh.length} · left out ${sel.silent.length + sel.brief.length}`);

// the words for each project (my own line from config.json, else the site's, else GitHub's)
const cards = shown.map((r) => ({ d: describe(r, { config, site: data.site, now }) }));
fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
if (!cached) fs.writeFileSync(cacheFile, JSON.stringify(data));

// the avatar, re-encoded as a small plain JPEG (saved, so a cached run needs no network)
const avatarFile = path.join(root, 'assets', 'avatar.jpg');
if (!cached && data.profile?.avatar) {
  try {
    const res = await fetch(data.profile.avatar + (data.profile.avatar.includes('?') ? '&' : '?') + 's=208', { signal: AbortSignal.timeout(20_000) });
    if (res.ok) fs.writeFileSync(avatarFile, await sharp(Buffer.from(await res.arrayBuffer())).resize(208, 208).jpeg({ quality: 82, mozjpeg: true }).toBuffer());
  } catch (e) {
    log(`  ! avatar: ${e.message}`);
  }
}
const avatar = fs.existsSync(avatarFile) ? { mime: 'image/jpeg', b64: fs.readFileSync(avatarFile).toString('base64') } : null;

// draw
const out = path.join(root, 'edition');
fs.mkdirSync(out, { recursive: true });
const written = new Set();
const put = (file, text) => {
  written.add(file);
  const p = path.join(out, file);
  if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== text) fs.writeFileSync(p, text);
};

// at most two commits from any one repo, so one busy project doesn't take the whole list
const perRepo = {};
const commits = data.wire.filter((c) => (perRepo[c.repo] = (perRepo[c.repo] || 0) + 1) <= 2).slice(0, 6);
data.wire = commits;
const cal = data.calendar;
const langs = (data.languages || []).filter(([n]) => n !== 'Jupyter Notebook' || config.countNotebooks);
const hasStats = !!cal && !!config.show?.stats;
const hasActivity = !!config.show?.activity;
const cardLines = Math.max(1, ...cards.map((c) => blurbLines(c.d.blurb))); // every card leaves room for the longest line, so a row lines up

for (const theme of ['light', 'dark']) {
  if (cal) put(`hero-skyline-${theme}.svg`, heroSkyline(theme, { weeks: cal.weeks, total: cal.total }));
  for (const { d } of cards) put(`${cardFile(d.name)}-${theme}.svg`, card(theme, d, now, cardLines));
  const ph = Math.max(activityHeight(commits.length), 620); // the activity and stats panels sit side by side, so they share a height
  if (config.show?.activity && commits.length >= 2) put(`activity-${theme}.svg`, activity(theme, commits, now, ph));
  if (config.show?.stats && cal) {
    const facts = calendarFacts(cal.weeks);
    put(`stats-${theme}.svg`, stats(theme, { contributions: cal.total, commits: cal.commits, prs: cal.prs, repos: data.profile?.publicRepos ?? data.repos.filter((r) => !r.private).length, languages: langs, ...facts }, ph));
  }
}
// the link badges (one picture each: white on a colour reads on light and dark alike)
for (const [label] of Object.entries(config.links)) put(`${linkFile(label)}.svg`, badge(label, BADGES[label]));
// the picture for tgoyal.me/github's link preview (it's read from here, so it stays current)
if (cal) {
  const png = await sharp(Buffer.from(social({ name: config.name, handle: config.handle, tagline: config.tagline, avatar, weeks: cal.weeks }))).png({ compressionLevel: 9 }).toBuffer();
  written.add('social.png');
  const sp = path.join(out, 'social.png');
  if (!fs.existsSync(sp) || Buffer.compare(fs.readFileSync(sp), png) !== 0) fs.writeFileSync(sp, png);
}
// tidy: files for things that are no longer shown
for (const f of fs.readdirSync(out)) if (!written.has(f)) fs.rmSync(path.join(out, f));

fs.writeFileSync(
  path.join(root, 'README.md'),
  readme({
    config,
    now,
    leads: cards.slice(0, sel.leads.length).map((c) => c.d),
    fresh: cards.slice(sel.leads.length).map((c) => c.d),
    wire: commits,
    calendar: data.calendar,
    hasStats,
    hasActivity,
  }),
);

// the run's notes (shown on the Actions run page)
const notes = [
  `${sel.leads.length} featured, ${sel.fresh.length} recently shipped. ${sel.brief.length} other projects aren't on the page (it shows only the main ones).`,
  ...data.warnings.map((w) => `- ⚠️ ${w}`),
  ...sel.missingLeads.map((n) => `- ⚠️ \`lead\` names "${n}", which isn't a public repo.`),
  ...(sel.silent.length ? [`- Not shown, because they have no description, site or topics: ${sel.silent.map((n) => `\`${n}\``).join(', ')}. Add a description on GitHub (or a \`repos\` entry in config.json) to bring one in.`] : []),
];
log('\n' + notes.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, notes.join('\n') + '\n');
