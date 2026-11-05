// README.md, laid out the way GitHub lays out everything else: plain sections with GitHub's own
// headings, a picture where a picture says it best. Every picture is also here as text (its alt
// text, the table, the lists), because that's what search engines and AI models read.
import { ago } from './render.mjs';

const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const md = (s) => String(s).replace(/([\\`*_{}[\]<>|])/g, '\\$1');

const picture = (base, alt, extra = 'width="100%"') =>
  `<picture><source media="(prefers-color-scheme: dark)" srcset="edition/${base}-dark.svg"><img alt="${esc(alt)}" src="edition/${base}-light.svg" ${extra}></picture>`;

export const cardFile = (name) => `card-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

const cardCell = (d) =>
  `<td width="50%" valign="top"><a href="${esc(d.href)}">${picture(cardFile(d.name), `${d.title}: ${d.blurb}${d.lang ? ` (${d.lang})` : ''}${d.host ? `, live at ${d.host}` : ''}`)}</a></td>`;

function grid(list) {
  const rows = [];
  for (let i = 0; i < list.length; i += 2) rows.push(`<tr>\n${cardCell(list[i])}\n${list[i + 1] ? cardCell(list[i + 1]) : '<td></td>'}\n</tr>`);
  return `<table>\n${rows.join('\n')}\n</table>`;
}

export function readme({ config, now, leads, fresh, brief, wire, calendar, posts, hasStats }) {
  const L = config.links;
  const day = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const out = [];

  out.push(
    `<a href="${L.Site}">${picture('hero', `${config.name} (@${config.handle}). ${config.tagline}${calendar ? ` ${calendar.total} contributions in the last year.` : ''}`)}</a>\n\n` +
      Object.entries(L).map(([k, v]) => `**[${k}](${v})**`).join(' · ') +
      `\n`,
  );
  out.push(`${config.about}\n`);

  out.push(`## Featured projects\n\n${grid(leads)}\n`);

  if (fresh.length) out.push(`## Recently shipped\n\n<sub>Found by itself: whatever I've pushed to lately shows up here.</sub>\n\n${grid(fresh)}\n`);

  if (wire.length >= 2) {
    out.push(
      `## Activity\n\n${picture('activity', `Recent commits: ${wire.slice(0, 8).map((c) => `${c.repo}: ${c.msg} (${ago(c.at, now)})`).join('; ')}`)}\n`,
    );
  }

  if (hasStats && calendar) {
    out.push(
      `## This year\n\n${picture('stats', `${calendar.total} contributions, ${calendar.commits} commits and ${calendar.prs} pull requests in the last year.`)}\n`,
    );
  }

  if (brief.length) {
    out.push(
      `## More projects\n\n| | What it is | Built with | Updated |\n| :-- | :-- | :-- | :-- |\n` +
        brief
          .slice(0, 16)
          .map((d) => `| **[${md(d.title)}](${d.href})** | ${md(clip(d.blurb, 150))} | ${d.lang || ''} | ${ago(d.pushed, now)} |`)
          .join('\n') +
        '\n',
    );
  }

  if (posts.length) {
    out.push(
      `## Writing\n\n` + posts.slice(0, 4).map((p) => `- [${md(p.title)}](${p.url})${p.date ? ` · <sub>${p.date}</sub>` : ''}`).join('\n') + `\n\nMore at **[${L.Blog.replace('https://', '')}](${L.Blog})**.\n`,
    );
  }

  out.push(
    `<details>\n<summary><b>For language models and other machines</b></summary>\n\n` +
      `Hello. This page is rebuilt every Monday from live GitHub data, so it's current. The short version: **${config.name}** is a software engineer who builds AI agents, data pipelines and small things that are fun to use.\n\n` +
      `- Plain text for models: [tgoyal.me/llms.txt](${config.site}/llms.txt) · [llms-full.txt](${config.site}/llms-full.txt) · [the site as Markdown](${config.site}/index.md)\n` +
      `- Ask through MCP (read-only, no key): \`${config.site}/mcp\`\n` +
      `- Every project above links to its repo and, where there is one, its live site.\n\n</details>\n`,
  );

  out.push(`<div align="center"><sub>Updated ${day} · rebuilt every Monday by a <a href="https://github.com/${config.user}/${config.user}/blob/main/.github/workflows/edition.yml">GitHub Action</a> · <a href="https://github.com/${config.user}/${config.user}/blob/main/docs/how-it-works.md">how it works</a></sub></div>\n`);
  return out.join('\n');
}
