// README.md, laid out the way GitHub lays out everything else: plain sections with GitHub's own
// headings, text you can select and links you can follow, and a picture only where a picture helps
// (the year as a skyline, a small thumbnail by each project). Everything a picture shows is also
// here as text, because that's what search engines and AI models read.
import { ago } from './render.mjs';

const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const md = (s) => String(s).replace(/([\\`*_{}[\]<>|])/g, '\\$1');

const picture = (base, alt, extra = 'width="100%"') =>
  `<picture><source media="(prefers-color-scheme: dark)" srcset="edition/${base}-dark.svg"><img alt="${esc(alt)}" src="edition/${base}-light.svg" ${extra}></picture>`;

export const thumbFile = (name) => `thumb-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

// the links are an ordinary line of links, like any README's
const ICON = { Portfolio: '🌐', Site: '🌐', Blog: '✍️', LinkedIn: '💼', Resume: '📄', Email: '✉️', GitHub: '🐙' };
const links = (L) => Object.entries(L).map(([k, url]) => `${ICON[k] || '🔗'} [${md(k)}](${url})`).join(' · ');

// One project: a small picture, then the name (a link to the repository, which is where a click on a
// repo is expected to go) and what it is. The words are the card; the picture is a thumbnail.
const meta = (d, now) => [d.lang, d.stars > 0 ? `★ ${d.stars}` : '', `updated ${ago(d.pushed, now)}`].filter(Boolean).join(' · ');
const row = (d, now) =>
  `<tr>\n<td width="176" valign="top"><a href="${esc(d.repoUrl)}">${picture(thumbFile(d.name), `${d.title}, preview`, 'width="160"')}</a></td>\n` +
  `<td valign="top"><b><a href="${esc(d.repoUrl)}">${esc(d.title)}</a></b><br>${esc(clip(d.blurb, 175))}<br><sub>${esc(meta(d, now))}</sub></td>\n</tr>`;

export function readme({ config, now, leads, fresh, brief, wire, calendar, posts, hasStats, hasActivity }) {
  const day = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const out = [];

  // the year, then who I am (once: the name and photo are already in GitHub's own sidebar), then where else to find me
  if (calendar) out.push(`${picture('hero-skyline', `${calendar.total} contributions in the last year, as a skyline of towers: taller means a busier day.`)}\n`);
  out.push(`${config.about}\n`);
  out.push(`${links(config.links)}\n`);

  // the curated projects first, then whatever I've pushed to lately that isn't one of them: new repos join by themselves
  out.push(`## Projects\n\n<table>\n${[...leads, ...fresh].map((d) => row(d, now)).join('\n')}\n</table>\n`);

  const showActivity = hasActivity && wire.length >= 2, showStats = hasStats && calendar;
  if (showActivity || showStats) {
    out.push(
      `## Activity\n\n<p>\n` +
        (showActivity ? `${picture('activity', `Recent commits: ${wire.slice(0, 6).map((c) => `${c.repo}: ${c.msg} (${ago(c.at, now)})`).join('; ')}`, 'width="402"')}\n` : '') +
        (showStats ? `${picture('stats', `${calendar.total} contributions, ${calendar.commits} commits and ${calendar.prs} pull requests in the last year, with a language breakdown.`, 'width="402"')}\n` : '') +
        `</p>\n`,
    );
  }

  if (brief.length) {
    out.push(`## More\n\n` + brief.slice(0, 16).map((d) => `- **[${md(d.title)}](${d.repoUrl})**: ${md(clip(d.blurb, 150))}${d.lang ? ` <sub>${md(d.lang)}</sub>` : ''}`).join('\n') + '\n');
  }

  if (posts.length) {
    out.push(`## Writing\n\n` + posts.slice(0, 4).map((p) => `- [${md(p.title)}](${p.url})${p.date ? ` · <sub>${p.date}</sub>` : ''}`).join('\n') + `\n`);
  }

  out.push(
    `<details>\n<summary>For language models</summary>\n\n` +
      `${config.name} is a software engineer who builds AI agents, data pipelines and small things that are fun to use. The short version is at [tgoyal.me/llms.txt](${config.site}/llms.txt), everything is at [llms-full.txt](${config.site}/llms-full.txt), and there is a read-only MCP server at \`${config.site}/mcp\`.\n\n</details>\n`,
  );

  out.push(`<div align="center"><sub>Updated ${day} · rebuilt every Monday · <a href="https://github.com/${config.user}/${config.user}/blob/main/docs/how-it-works.md">how it works</a></sub></div>\n`);
  return out.join('\n');
}
