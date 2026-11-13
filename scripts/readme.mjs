// README.md, laid out the way GitHub lays out everything else: plain headings, links you can follow,
// and a picture where a picture says it best (the year as a skyline, a card for each project).
// Everything a picture shows is also here as text (its alt text), because that is what search
// engines and AI models read.
import { ago } from './render.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const picture = (base, alt, extra = 'width="100%"') =>
  `<picture><source media="(prefers-color-scheme: dark)" srcset="edition/${base}-dark.svg"><img alt="${esc(alt)}" src="edition/${base}-light.svg" ${extra}></picture>`;

export const cardFile = (name) => `card-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
export const linkFile = (label) => `link-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

// A card is one image, and it opens the repository: that's where a click on a repo card goes on
// GitHub, and it keeps people on GitHub. Cards flow like text instead of sitting in a table, so two
// sit side by side on a desktop and they stack, full width and readable, on a phone.
const cardLink = (d) =>
  `<a href="${esc(d.repoUrl)}">${picture(cardFile(d.name), `${d.title}: ${d.blurb}${d.lang ? ` (${d.lang})` : ''}. Opens the repository.`, 'width="402"')}</a>`;

// the links are small coloured badges, the kind every README has (one picture serves both themes)
const badges = (links) => `<p>\n${Object.keys(links).map((k) => `<a href="${esc(links[k])}"><img alt="${esc(k)}" src="edition/${linkFile(k)}.svg" height="32"></a>`).join('\n')}\n</p>`;

export function readme({ config, now, leads, fresh, calendar, wire = [], hasStats, hasActivity }) {
  const day = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const out = [];

  // the year, then who I am (once: the name and photo are already in GitHub's own sidebar), then where else to find me
  if (calendar) out.push(`${picture('hero-skyline', `${calendar.total} contributions in the last year, as a skyline of towers: taller means a busier day.`)}\n`);
  out.push(`${config.about}\n`);
  out.push(`${badges(config.links)}\n`);

  // the curated projects first, then whatever I've pushed to lately that isn't one of them: new repos join by themselves
  out.push(`## Projects\n\n<p>\n${[...leads, ...fresh].map(cardLink).join('\n')}\n</p>\n`);

  const showActivity = hasActivity && wire.length >= 2, showStats = hasStats && calendar;
  if (showActivity || showStats) {
    out.push(
      `## Activity\n\n<p>\n` +
        (showActivity ? `${picture('activity', `Recent commits: ${wire.slice(0, 6).map((c) => `${c.repo}: ${c.msg} (${ago(c.at, now)})`).join('; ')}`, 'width="402"')}\n` : '') +
        (showStats ? `${picture('stats', `${calendar.total} contributions, ${calendar.commits} commits and ${calendar.prs} pull requests in the last year, with a language breakdown.`, 'width="402"')}\n` : '') +
        `</p>\n`,
    );
  }

  out.push(`<div align="center"><sub>Updated ${day} · rebuilt every Monday · <a href="https://github.com/${config.user}/${config.user}/blob/main/docs/how-it-works.md">how it works</a></sub></div>\n`);
  return out.join('\n');
}
