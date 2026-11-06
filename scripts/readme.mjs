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
// GitHub, and it keeps people on GitHub. Cards flow like text instead of sitting in a table, so two
// sit side by side on a desktop and they stack, full width and readable, on a phone.
const cardLink = (d) =>
  `<a href="${esc(d.repoUrl)}">${picture(cardFile(d.name), `${d.title}: ${d.blurb}${d.lang ? ` (${d.lang})` : ''}${d.host ? `, live at ${d.host}` : ''}. Opens the repository.`, 'width="402"')}</a>`;

const cards = (list) => `<p>\n${list.map(cardLink).join('\n')}\n</p>`;

const buttons = (links) =>
  `<p>\n${Object.keys(links)
    .map((k) => `<a href="${esc(links[k])}">${picture(linkFile(k), k, 'height="36"')}</a>`)
    .join('\n')}\n</p>`;

export function readme({ config, now, leads, fresh, brief, wire, calendar, posts, hasStats, hasActivity }) {
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

  // the curated projects first, then whatever I've pushed to lately that isn't one of them: new repos join by themselves
  out.push(`## Projects\n\n${cards([...leads, ...fresh])}\n`);

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
    out.push(
      `## More\n\n| Project | What it is | Built with |\n| :-- | :-- | :-- |\n` +
        brief
          .slice(0, 16)
          .map((d) => `| **[${md(d.title)}](${d.repoUrl})** | ${md(clip(d.blurb, 150))} | ${d.lang || ''} |`)
          .join('\n') +
        '\n',
    );
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
