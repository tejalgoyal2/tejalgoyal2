// The pieces of the profile, drawn as SVG in GitHub's own look: Primer's colours (light and dark
// are each designed on their own, not one flipped into the other), GitHub's typefaces, and the
// contribution greens. What's new is made out of the data:
//   skyline   the last year's contributions as an isometric skyline that rises when you arrive
//   thumb     a small picture for a project: its own share image or a screenshot, or, when it has
//             neither, its commits drawn as towers of little blocks in its language's colour
//   activity  your latest commits as a git graph, one lane per repo (off unless switched on)
//   stats     the year in numbers and a language bar (off unless switched on)
// Every word is an outline (scripts/type.mjs). Motion is CSS only and runs once, on arrival; the
// base state is always the finished picture, so with prefers-reduced-motion, or in anything that
// doesn't run animations, you simply see it done.
import { line, block, measure } from './type.mjs';

export const THEMES = {
  light: {
    canvas: '#ffffff', subtle: '#f6f8fa', border: '#d1d9e0', fg: '#1f2328', muted: '#59636e',
    accent: '#0969da', accentBg: '#ddf4ff', green: '#1a7f37', greenBg: '#dafbe1', purple: '#8250df', purpleBg: '#fbefff',
    orange: '#bc4c00', yellow: '#9a6700', pink: '#bf3989',
    contrib: ['#eff2f5', '#aceebb', '#4ac26b', '#2da44e', '#116329'],
  },
  dark: {
    canvas: '#0d1117', subtle: '#151b23', border: '#3d444d', fg: '#f0f6fc', muted: '#9198a1',
    accent: '#4493f8', accentBg: '#1c2d44', green: '#3fb950', greenBg: '#14301e', purple: '#ab7df8', purpleBg: '#2a2144',
    orange: '#f0883e', yellow: '#d29922', pink: '#ff80c8',
    contrib: ['#151b23', '#0e4429', '#006d32', '#26a641', '#39d353'],
  },
};

// GitHub's own language colours (linguist)
export const LANG = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Rust: '#dea584', Swift: '#F05138', HTML: '#e34c26',
  CSS: '#663399', 'Jupyter Notebook': '#DA5B0B', Java: '#b07219', Go: '#00ADD8', Shell: '#89e051', C: '#555555',
  'C++': '#f34b7d', Kotlin: '#A97BFF', Ruby: '#701516', PHP: '#4F5D95', 'Objective-C': '#438eff', SQL: '#e38c00',
  PowerShell: '#012456', MATLAB: '#e16737', Dockerfile: '#384d54', SCSS: '#c6538c', Vue: '#41b883', Svelte: '#ff3e00',
};
export const langColor = (name) => LANG[name] || '#8b949e';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r1 = (n) => Math.round(n * 10) / 10;
const path = (d, fill, extra = '') => (d ? `<path d="${d}" fill="${fill}"${extra ? ' ' + extra : ''}/>` : '');
/** text as a filled outline: T('semibold', 'Hi', x, y, size, color, opts) */
const T = (font, text, x, y, size, fill, opts) => path(line(font, text, x, y, size, opts).d, fill);

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
/** mix(a, b, t): t of the way from a to b */
export const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
const shade = (c, f) => toHex(hex(c).map((v) => v * f));

const svg = (w, h, { title, desc, css = '' }, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="t d">` +
  `<title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc>` +
  `<style>${css}@media (prefers-reduced-motion: reduce){*{animation:none!important}}</style>${body}</svg>\n`;

/** "3d ago", "2w ago", "Oct 2025" */
export function ago(iso, now = new Date()) {
  const days = Math.floor((now - new Date(iso)) / 864e5);
  if (!(days >= 1)) return 'today'; // also covers a date in the future
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.round(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const frame = (t, w, h, r = 16) => `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${r}" fill="${t.canvas}" stroke="${t.border}" stroke-width="2"/>`;

/** a GitHub-style label: rounded, outlined, optionally with a leading dot. Returns its width and markup. */
function pill(t, text, x, y, { color, bg = 'none', border = color, dot = false, size = 18, font = 'medium', h = 34 } = {}) {
  const tw = measure(font, text, size);
  const w = tw + 28 + (dot ? 18 : 0);
  return {
    w,
    svg:
      `<rect x="${r1(x)}" y="${y}" width="${r1(w)}" height="${h}" rx="${h / 2}" fill="${bg}" stroke="${border}" stroke-width="1.5"/>` +
      (dot ? `<circle cx="${r1(x + 20)}" cy="${y + h / 2}" r="4.5" fill="${color}"/>` : '') +
      T(font, text, x + 14 + (dot ? 18 : 0), y + h / 2 + size * 0.35, size, color),
  };
}

// ─── the year as a skyline ───────────────────────────────────────────────────

/** The contribution calendar as an isometric bar chart, in GitHub's greens. */
export function skyline(t, weeks, cx, top, s = 10, H = 84) {
  const a = s * 0.866, b = s * 0.5, gap = 0.86;
  const max = Math.max(1, ...weeks.flatMap((w) => w.days.map((d) => d.count)));
  const cells = weeks.flatMap((w, i) => w.days.map((d, j) => ({ i, j, d })));
  cells.sort((p, q) => p.i + p.j - (q.i + q.j) || p.i - q.i); // back to front
  const x0 = cx - ((weeks.length - 1 - 6) * a) / 2, y0 = top + H + b;
  return cells
    .map(({ i, j, d }) => {
      const X = x0 + (i - j) * a, Y = y0 + (i + j) * b;
      const level = d.count === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((4 * d.count) / max)));
      const h = d.count === 0 ? 0 : Math.max(4, Math.sqrt(d.count / max) * H);
      const c = t.contrib[level];
      const A = a * gap, B = b * gap;
      const P = (...pts) => pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' ');
      const topFace = `<polygon points="${P([X, Y - h - B], [X + A, Y - h], [X, Y - h + B], [X - A, Y - h])}" fill="${c}"/>`;
      const sides = h
        ? `<polygon points="${P([X - A, Y - h], [X, Y - h + B], [X, Y + B], [X - A, Y])}" fill="${shade(c, 0.78)}"/>` +
          `<polygon points="${P([X + A, Y - h], [X, Y - h + B], [X, Y + B], [X + A, Y])}" fill="${shade(c, 0.6)}"/>`
        : '';
      const f = (i + j) / (weeks.length + 6);
      return h ? `<g class="w" style="--d:${(f * 1.6).toFixed(2)}s;--e:${(2.4 + f * 3.4).toFixed(2)}s">${sides}${topFace}</g>` : topFace;
    })
    .join('');
}

/**
 * The year as one wide picture: the number on the left, the skyline rising on the right.
 * No frame, so it sits on the page the way GitHub's own contribution graph does.
 */
export function heroSkyline(theme, data) {
  const t = THEMES[theme];
  const W = 860, H = 372;
  const out = [];
  const total = data.total.toLocaleString('en-US');
  out.push(T('bold', total, 4, 70, 72, t.fg));
  out.push(T('text', 'contributions in the last year', 6, 106, 22, t.muted));
  // the legend GitHub puts under its own contribution graph
  out.push(T('mono', 'Less', 6, H - 12, 15, t.muted));
  let x = 6 + measure('mono', 'Less', 15) + 10;
  for (const c of t.contrib) {
    out.push(`<rect x="${x}" y="${H - 26}" width="15" height="15" rx="3" fill="${c}"/>`);
    x += 21;
  }
  out.push(T('mono', 'More', x + 4, H - 12, 15, t.muted));
  out.push(skyline(t, data.weeks, 556, 0, 9.4, 82));
  // each tower grows up from the ground once, in a wave from the oldest day to the newest, then a slow light passes over them
  const css =
    `.w{transform-box:fill-box;transform-origin:50% 100%;animation-name:rise,glint;animation-duration:1.1s,10s;` +
    `animation-timing-function:cubic-bezier(.2,.7,.2,1),ease-in-out;animation-delay:var(--d),var(--e);` +
    `animation-iteration-count:1,infinite;animation-fill-mode:backwards,none}` +
    `@keyframes rise{from{transform:scaleY(0)}}@keyframes glint{0%,60%,100%{opacity:1}30%{opacity:.55}}`;
  return svg(W, H, { title: 'Contributions', desc: `${data.total} contributions in the last year, drawn as an isometric skyline: taller, darker towers are busier days.`, css }, out.join(''));
}

// ─── a project's picture ─────────────────────────────────────────────────────

const seeded = (str) => {
  let s = 2166136261;
  for (const c of str) s = Math.imul(s ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 1013904223) >>> 0) / 4294967296);
};

/**
 * A repo's life as a skyline: one tower per week, and every block in it is a commit (a block is a few
 * commits when a week was busy). Young repos fill the picture; the newest week is on the right.
 * @param weeks number[] commits per week, oldest first (up to 52)
 */
export function commitTowers(theme, weeks, lang, w, h) {
  const t = THEMES[theme];
  const base = langColor(lang);
  const ramp = [mix(t.subtle, base, 0.4), mix(t.canvas, base, 0.6), mix(t.canvas, base, 0.82), base];
  const from = Math.max(0, weeks.findIndex((v) => v > 0));
  const active = weeks.slice(from);
  const n = Math.max(22, active.length), pad = 16;
  const pitch = (w - 2 * pad) / n, sq = pitch * 0.8;
  const rows = Math.floor((h - 2 * pad) / pitch), top = (h - rows * pitch) / 2;
  const max = Math.max(1, ...active), k = Math.ceil(max / rows);
  const empty = mix(t.subtle, t.border, 0.55);
  const rect = (c, r, fill) => `<rect x="${r1(pad + c * pitch + (pitch - sq) / 2)}" y="${r1(top + r * pitch + (pitch - sq) / 2)}" width="${r1(sq)}" height="${r1(sq)}" rx="${r1(sq * 0.24)}" fill="${fill}"/>`;
  // the unlit grid first, like GitHub's empty contribution squares; a commit lights one, from the ground up
  const out = [];
  for (let c = 0; c < n; c++) for (let r = 0; r < rows; r++) out.push(rect(c, r, empty));
  active.forEach((v, i) => {
    if (!v) return;
    const c = n - active.length + i, lit = Math.min(rows, Math.ceil(v / k));
    const col = ramp[Math.min(3, Math.ceil((4 * v) / max) - 1)];
    const blocks = Array.from({ length: lit }, (_, q) => rect(c, rows - 1 - q, col));
    out.push(`<g class="c" style="--d:${(0.1 + (c / n) * 0.9).toFixed(2)}s">${blocks.join('')}</g>`);
  });
  return out.join('');
}

/** For a repo with no history to draw: a quiet grid of commit squares in the language's colour, the same for the same name. */
export function cover(theme, title, lang, x, y, w, h) {
  const t = THEMES[theme];
  const rnd = seeded(title);
  const base = langColor(lang);
  const ramp = [t.contrib[0], mix(t.canvas, base, 0.3), mix(t.canvas, base, 0.55), mix(t.canvas, base, 0.8), base];
  const waves = Array.from({ length: 3 }, () => ({ fx: 0.03 + rnd() * 0.06, fy: 0.04 + rnd() * 0.1, p: rnd() * 6.28 }));
  const pitch = 20, size = 16;
  const cells = [];
  for (let j = 0; j * pitch < h; j++)
    for (let i = 0; i * pitch < w; i++) {
      const v = waves.reduce((s, k) => s + Math.sin(i * k.fx * 6.28 + k.p) * Math.cos(j * k.fy * 6.28 + k.p), 0) / 3 + (rnd() - 0.5) * 0.55;
      const level = v < -0.12 ? 0 : v < 0.08 ? 1 : v < 0.26 ? 2 : v < 0.4 ? 3 : 4;
      cells.push(`<rect x="${i * pitch + 3}" y="${j * pitch + 3}" width="${size}" height="${size}" rx="4" fill="${ramp[level]}"/>`);
    }
  return `<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" fill="${t.subtle}"/>${cells.join('')}</g>`;
}

/**
 * A project's thumbnail, 160 x 100 on the page (drawn at twice that): its own picture if it has one,
 * else its commits as towers, else a plain grid. Small on purpose: the words beside it are the card.
 * @param repo {{ title:string, blurb:string, lang?:string, image?:{mime:string,b64:string}, rhythm?:number[]|null }}
 */
export function thumb(theme, repo) {
  const t = THEMES[theme];
  const W = 320, H = 200, R = 16;
  const out = [`<clipPath id="r"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="${R}"/></clipPath>`, `<g clip-path="url(#r)">`];
  const towers = !repo.image && repo.rhythm && repo.rhythm.reduce((a, b) => a + b, 0) >= 3;
  if (repo.image) {
    out.push(`<rect width="${W}" height="${H}" fill="${t.subtle}"/>`);
    out.push(`<image href="data:${repo.image.mime};base64,${repo.image.b64}" width="${W}" height="${H}" preserveAspectRatio="xMidYMin slice"/>`);
  } else if (towers) out.push(`<rect width="${W}" height="${H}" fill="${t.subtle}"/>` + commitTowers(theme, repo.rhythm, repo.lang, W, H));
  else out.push(cover(theme, repo.title, repo.lang, 0, 0, W, H));
  out.push(`</g><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="${R}" fill="none" stroke="${t.border}" stroke-width="2"/>`);
  const css = `.c{transform-box:fill-box;transform-origin:50% 100%;animation:rise 1s cubic-bezier(.2,.7,.2,1) var(--d) backwards}@keyframes rise{from{transform:scaleY(0)}}`;
  // 24px of clear space on the right is the gap between the picture and the words beside it
  return svg(W + 24, H, { title: repo.title, desc: `${repo.title}: ${repo.blurb}`, css }, out.join(''));
}

// ─── recent commits as a git graph ───────────────────────────────────────────

/** @param commits {{ repo:string, msg:string, at:string, sha:string }[]} newest first */
export const activityHeight = (n) => 104 + n * 88 + 16;
export function activity(theme, commits, now = new Date(), height = 0) {
  const t = THEMES[theme];
  const W = 800, row = 88, top = 104;
  const H = Math.max(height, activityHeight(commits.length));
  const colors = [t.accent, t.green, t.purple, t.orange, t.pink];
  const lanes = [];
  for (const c of commits) if (!lanes.includes(c.repo)) lanes.push(c.repo);
  const lane = (repo) => Math.min(lanes.indexOf(repo), 4);
  const lx = (repo) => 46 + lane(repo) * 26;
  const col = (repo) => colors[lane(repo)];
  const textX = 46 + Math.min(lanes.length, 5) * 26 + 18;

  const out = [frame(t, W, H)];
  out.push(T('semibold', 'Recent commits', 40, 56, 28, t.fg));
  out.push(T('text', 'across my public repositories', 40 + measure('semibold', 'Recent commits', 28) + 14, 56, 18, t.muted));
  out.push(`<rect x="1" y="80" width="${W - 2}" height="1.5" fill="${t.border}"/>`);

  const cy = (k) => top + k * row + 24;
  commits.forEach((c, k) => {
    if (k < commits.length - 1) {
      const n = commits[k + 1], x = lx(c.repo), nx = lx(n.repo), y = cy(k), ny = cy(k + 1);
      out.push(`<path d="M${x},${y} C${x},${y + row * 0.55} ${nx},${ny - row * 0.55} ${nx},${ny}" fill="none" stroke="${col(n.repo)}" stroke-width="3.5" stroke-linecap="round"/>`);
    }
  });
  commits.forEach((c, k) => {
    const y = cy(k), x = lx(c.repo);
    out.push(`<circle cx="${x}" cy="${y}" r="9" fill="${col(c.repo)}" stroke="${t.canvas}" stroke-width="4"/>`);
    out.push(pill(t, c.repo, textX, y - 16, { color: col(c.repo), border: col(c.repo), size: 15, font: 'mono', h: 30 }).svg);
    out.push(T('mono', `${c.sha.slice(0, 7)} · ${ago(c.at, now)}`, W - 32, y + 5, 15, t.muted, { anchor: 'end' }));
    out.push(path(block('text', c.msg, textX, y + 41, 23, W - 32 - textX, { lead: 29, maxLines: 2 }).d, t.fg));
  });
  return svg(W, H, { title: 'Recent commits', desc: commits.map((c) => `${c.repo}: ${c.msg} (${ago(c.at, now)})`).join('. ') }, out.join(''));
}

// ─── the year in numbers, and a language bar ─────────────────────────────────

/**
 * @param s {{ contributions:number, commits:number, prs:number, repos:number, streak:number, busiest:{count:number,label:string}|null, languages:[string, number][] }}
 * @param height the height to match (the activity panel beside it)
 */
export function stats(theme, s, height = 0) {
  const t = THEMES[theme];
  const W = 800, H = Math.max(height, 600);
  const sep = H - 168;
  const tiles = [
    [s.contributions, 'contributions in the last year'],
    [s.commits, 'commits'],
    [s.prs, 'pull requests'],
    [s.repos, 'public repositories'],
    ...(s.streak != null ? [[s.streak, s.streak === 1 ? 'day, longest streak' : 'days, longest streak']] : []),
    ...(s.busiest ? [[s.busiest.count, `contributions on ${s.busiest.label}, my busiest day`]] : []),
  ];
  const rows = Math.ceil(tiles.length / 2), gap = rows > 1 ? (sep - 60 - 130) / (rows - 1) : 0;
  const out = [];
  tiles.forEach(([v, label], i) => {
    const x = 44 + (i % 2) * 372, y = 96 + Math.floor(i / 2) * Math.min(gap, 150);
    out.push(T('bold', Number(v).toLocaleString('en-US'), x, y, 66, t.fg));
    out.push(path(block('text', label, x, y + 36, 21, 330, { lead: 26, maxLines: 2 }).d, t.muted));
  });
  out.push(`<rect x="${W / 2 - 1}" y="40" width="1.5" height="${sep - 60}" fill="${t.border}"/>`);
  out.push(`<rect x="1" y="${sep}" width="${W - 2}" height="1.5" fill="${t.border}"/>`);

  // GitHub's language bar, and its legend (wrapping onto a second line)
  const total = s.languages.reduce((a, [, b]) => a + b, 0) || 1;
  const top = s.languages.slice(0, 6);
  const rest = total - top.reduce((a, [, b]) => a + b, 0);
  const segs = rest > total * 0.005 ? [...top, ['Other', rest]] : top;
  const bx = 44, bw = W - 88, by = sep + 36;
  out.push(`<clipPath id="lb"><rect x="${bx}" y="${by}" width="${bw}" height="14" rx="7"/></clipPath><g clip-path="url(#lb)">`);
  let x = bx;
  for (const [name, bytes] of segs) {
    const w = (bytes / total) * bw;
    out.push(`<rect x="${r1(x)}" y="${by}" width="${r1(w + 1)}" height="14" fill="${name === 'Other' ? t.muted : langColor(name)}"/>`);
    x += w;
  }
  out.push('</g>');
  let lx = bx, ly = by + 54;
  for (const [name, bytes] of segs) {
    const pct = (bytes / total) * 100;
    const label = `${name} ${pct < 0.1 ? '<0.1' : pct.toFixed(1)}%`;
    const lw = 26 + measure('text', label, 20) + 24;
    if (lx + lw > W - 44) (lx = bx), (ly += 36);
    out.push(`<circle cx="${lx + 8}" cy="${ly - 6}" r="8" fill="${name === 'Other' ? t.muted : langColor(name)}"/>`);
    out.push(T('text', label, lx + 26, ly, 20, t.muted));
    lx += lw;
  }
  const desc = `${s.contributions} contributions, ${s.commits} commits, ${s.prs} pull requests, ${s.repos} public repositories${s.streak != null ? `, longest streak ${s.streak} days` : ''}. Languages: ${segs.map(([n, b]) => `${n} ${((b / total) * 100).toFixed(1)}%`).join(', ')}.`;
  return svg(W, H, { title: 'The year in numbers', desc }, frame(t, W, H) + out.join(''));
}

/** Longest run of days with a contribution, and the busiest single day, from the contribution calendar. */
export function calendarFacts(weeks) {
  const days = weeks.flatMap((w) => w.days);
  let run = 0, best = 0, busiest = null;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    best = Math.max(best, run);
    if (d.count > 0 && (!busiest || d.count > busiest.count)) busiest = d;
  }
  return { streak: best, busiest: busiest ? { count: busiest.count, label: new Date(busiest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) } : null };
}

// ─── the picture for a shared link ───────────────────────────────────────────

/**
 * 1200 x 630, for tgoyal.me/github's link preview: who I am, beside the skyline. One picture, drawn
 * on GitHub's dark canvas, because a preview shows up on every kind of background.
 * @param data {{ name:string, handle:string, tagline:string, avatar?:{mime:string,b64:string}, weeks:{days:{date:string,count:number}[]}[] }}
 */
export function social(data) {
  const t = THEMES.dark;
  const W = 1200, H = 630, L = 72;
  const out = [`<rect width="${W}" height="${H}" fill="${t.canvas}"/>`];
  out.push(skyline(t, data.weeks, 880, 96, 11.6, 96));
  // a soft fade so the skyline never runs into the words
  out.push(`<defs><linearGradient id="f" x1="0" x2="1"><stop offset="0" stop-color="${t.canvas}"/><stop offset="1" stop-color="${t.canvas}" stop-opacity="0"/></linearGradient></defs><rect x="0" y="0" width="640" height="${H}" fill="url(#f)"/>`);
  const ax = L + 62, ay = 148, ar = 62;
  out.push(`<clipPath id="av"><circle cx="${ax}" cy="${ay}" r="${ar}"/></clipPath>`);
  out.push(
    data.avatar
      ? `<image clip-path="url(#av)" href="data:${data.avatar.mime};base64,${data.avatar.b64}" x="${ax - ar}" y="${ay - ar}" width="${ar * 2}" height="${ar * 2}"/>`
      : `<circle cx="${ax}" cy="${ay}" r="${ar}" fill="${t.subtle}"/>`,
  );
  out.push(`<circle cx="${ax}" cy="${ay}" r="${ar}" fill="none" stroke="${t.border}" stroke-width="3"/>`);
  out.push(T('bold', data.name, ax + ar + 28, ay - 4, 62, t.fg));
  out.push(T('mono', `@${data.handle}`, ax + ar + 30, ay + 36, 26, t.muted));
  out.push(path(block('text', data.tagline, L, 292, 40, 520, { lead: 54, maxLines: 4 }).d, t.fg));
  out.push(T('mono', `github.com/${data.handle}`, L, H - 64, 30, t.accent));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${out.join('')}</svg>\n`;
}
