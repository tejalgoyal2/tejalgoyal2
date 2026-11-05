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

const slug = (k) => k.toLowerCase().replace(/[^a-z0-9]+/g, '-');
export const linkFile = (label) => `link-${slug(label)}`;

// A card is one image, and it opens the repository: that's where a click on a repo card goes on
// GitHub, and it keeps people on GitHub. The live site gets its own link right under the cards.
// Cards flow like text instead of sitting in a table, so two sit side by side on a desktop and
// they stack, full width and readable, on a phone.
const cardLink = (d) =>
  `<a href="${esc(d.repoUrl)}">${picture(cardFile(d.name), `${d.title}: ${d.blurb}${d.lang ? ` (${d.lang})` : ''}${d.host ? `, live at ${d.host}` : ''}. Opens the repository.`, 'width="402"')}</a>`;

const cards = (list) => `<p>\n${list.map(cardLink).join('\n')}\n</p>`;

const liveRow = (list) => {
  const live = list.filter((d) => d.live && d.homepage);
  return live.length ? `**Try them live:** ${live.map((d) => `[${md(d.title)} ↗](${d.homepage})`).join(' · ')}\n` : '';
};

const buttons = (links) =>
  `<p>\n${Object.keys(links)
    .map((k) => `<a href="${esc(links[k])}">${picture(linkFile(k), k, 'height="36"')}</a>`)
    .join('\n')}\n</p>`;

export function readme({ config, now, leads, fresh, brief, wire, calendar, posts, hasStats }) {
  const L = config.links;
  const day = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const out = [];

  const latest = wire[0] ? ` Latest push: ${wire[0].repo}: ${wire[0].msg}.` : '';
  out.push(
    `<p>\n${picture('hero-profile', `${config.name} (@${config.handle}). ${config.tagline}${latest}`, 'width="402"')}\n` +
      (calendar ? `${picture('hero-skyline', `${calendar.total} contributions in the last year, as a skyline of towers: taller means a busier day.`, 'width="402"')}\n` : '') +
      `</p>\n\n${buttons(L)}\n`,
  );
  out.push(`${config.about}\n`);

  out.push(`## Featured projects\n\n${cards(leads)}\n\n${liveRow(leads)}`);

  if (fresh.length) out.push(`## Recently shipped\n\n<sub>Found by itself: whatever I've pushed to lately shows up here.</sub>\n\n${cards(fresh)}\n\n${liveRow(fresh)}`);

  if (wire.length >= 2 || (hasStats && calendar)) {
    out.push(
      `## Activity\n\n<p>\n` +
        (wire.length >= 2 ? `${picture('activity', `Recent commits: ${wire.slice(0, 6).map((c) => `${c.repo}: ${c.msg} (${ago(c.at, now)})`).join('; ')}`, 'width="402"')}\n` : '') +
        (hasStats && calendar ? `${picture('stats', `${calendar.total} contributions, ${calendar.commits} commits and ${calendar.prs} pull requests in the last year, with a language breakdown.`, 'width="402"')}\n` : '') +
        `</p>\n`,
    );
  }

  if (brief.length) {
    out.push(
      `## More projects\n\n| Project | What it is | Built with |\n| :-- | :-- | :-- |\n` +
        brief
          .slice(0, 16)
          .map((d) => `| **[${md(d.title)}](${d.repoUrl})**${d.live && d.homepage ? ` · [live ↗](${d.homepage})` : ''} | ${md(clip(d.blurb, 150))} | ${d.lang || ''} |`)
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
