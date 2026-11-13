// Everything the edition is made from, fetched fresh each run: the repos, the latest commits,
// the contribution calendar, the blog's feed, and (once it's deployed) what tgoyal.me's own
// MCP server says about my projects. Anything optional that fails is skipped and reported;
// nothing here ever stops the front page from printing.
import { XMLParser } from 'fast-xml-parser';

const API = 'https://api.github.com';
const UA = 'tejalgoyal2-profile-edition (+https://github.com/tejalgoyal2/tejalgoyal2)';

const headers = (token) => ({
  'User-Agent': UA,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

async function gh(url, token) {
  const res = await fetch(url.startsWith('http') ? url : API + url, { headers: headers(token), signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

/**
 * Dates for a repo's commits, newest first, that never run ahead of the commit after them and never
 * land in the future. Commit dates are whatever the author set (some of mine are scheduled ahead),
 * so sorting by them alone would put a future-dated commit above everything that really came last.
 */
export function monotonic(dates, now = Date.now()) {
  let ceiling = now;
  return dates.map((d) => {
    const t = Math.min(new Date(d).getTime(), ceiling);
    ceiling = t;
    return new Date(t).toISOString();
  });
}

/** A commit message worth showing: first line, not a merge, not a robot's chore. */
export const worthShowing = (msg) => {
  const first = String(msg).split('\n')[0].trim();
  // not merges, robots' chores, or a bare file operation ("Adding a new resume.pdf")
  return first && !/^(merge\b|update blog posts|bump |chore\b)/i.test(first) && !/^(add(ing)?|rename|remove|delete|update)\b[^:]*\.\w{2,4}$/i.test(first) ? first : null;
};

export async function collect(config, { token, publicOnly = true, log = () => {} } = {}) {
  const user = config.user;
  const warnings = [];
  const safe = async (what, fn, fallback) => {
    try {
      return await fn();
    } catch (e) {
      warnings.push(`${what}: ${e.message}`);
      log(`  ! ${what}: ${e.message}`);
      return fallback;
    }
  };

  const repos = (await gh(`/users/${user}/repos?per_page=100&type=owner&sort=pushed`, token))
    .filter((r) => !publicOnly || !r.private)
    .map((r) => ({
      name: r.name,
      description: r.description || '',
      homepage: (r.homepage || '').trim(),
      language: r.language || '',
      topics: r.topics || [],
      stars: r.stargazers_count,
      forks: r.forks_count,
      fork: r.fork,
      archived: r.archived,
      private: r.private,
      created: r.created_at,
      pushed: r.pushed_at,
      url: r.html_url,
    }));

  const profile = await safe('profile', async () => {
    const u = await gh(`/users/${user}`, token);
    return { name: u.name || user, avatar: u.avatar_url, publicRepos: u.public_repos, followers: u.followers };
  }, null);

  // bytes of code per language across my own public repos, the way GitHub's language bar counts them
  const languages = await safe(
    'languages',
    async () => {
      const own = repos.filter((r) => !r.fork && !r.private && r.name !== user);
      const per = await Promise.all(own.map((r) => gh(`/repos/${user}/${r.name}/languages`, token).catch(() => ({}))));
      const sum = {};
      for (const l of per) for (const [k, v] of Object.entries(l)) sum[k] = (sum[k] || 0) + v;
      return Object.entries(sum).sort((a, b) => b[1] - a[1]);
    },
    [],
  );

  // recent commits: the newest real commit messages across the repos pushed to most recently
  const wire = await safe(
    'commits',
    async () => {
      const recent = repos.filter((r) => !r.fork && r.name !== user).slice(0, 8);
      const lists = await Promise.all(
        recent.map(async (r) => {
          const commits = await gh(`/repos/${user}/${r.name}/commits?per_page=8`, token);
          const when = monotonic(commits.map((c) => c.commit.author.date));
          return commits
            .map((c, i) => ({ c, at: when[i] }))
            .filter(({ c }) => c.commit.author?.email?.includes(user) || c.author?.login === user)
            .map(({ c, at }) => ({ repo: r.name, msg: worthShowing(c.commit.message), at, url: c.html_url, sha: c.sha }))
            .filter((c) => c.msg)
            .slice(0, 3); // a few from each repo, so one busy project can't fill the list
        }),
      );
      return lists.flat().sort((a, b) => b.at.localeCompare(a.at)).slice(0, 16);
    },
    [],
  );

  const calendar = await safe(
    'contribution calendar',
    async () => {
      const res = await fetch(API + '/graphql', {
        method: 'POST',
        headers: { ...headers(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query($u:String!){user(login:$u){contributionsCollection{totalCommitContributions totalPullRequestContributions contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`,
          variables: { u: user },
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const body = await res.json();
      const c = body?.data?.user?.contributionsCollection;
      if (!c) throw new Error(body?.errors?.[0]?.message || `no data (${res.status})`);
      return {
        total: c.contributionCalendar.totalContributions,
        commits: c.totalCommitContributions,
        prs: c.totalPullRequestContributions,
        weeks: c.contributionCalendar.weeks.map((w) => ({ days: w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount })) })),
      };
    },
    null,
  );

  const posts = await safe(
    'blog feed',
    async () => {
      const xml = await (await fetch(config.feed, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20_000) })).text();
      const doc = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' }).parse(xml);
      const entries = [].concat(doc.feed?.entry ?? doc.rss?.channel?.item ?? []);
      return entries.slice(0, 5).map((e) => ({
        title: String(e.title?.['#text'] ?? e.title ?? '').trim(),
        url: e.link?.['@_href'] ?? (typeof e.link === 'string' ? e.link : [].concat(e.link)[0]?.['@_href']),
        date: String(e.published ?? e.updated ?? e.pubDate ?? '').slice(0, 10),
      }));
    },
    [],
  );

  // what tgoyal.me says about itself, through its own MCP server (live once the site deploys it)
  const site = await safe(
    'tgoyal.me /mcp',
    async () => {
      const res = await fetch(config.site + '/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'User-Agent': UA },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'projects', arguments: {} } }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) throw new Error(`not served yet (${res.status})`);
      const list = JSON.parse((await res.json()).result.content[0].text);
      return Object.fromEntries(list.map((p) => [p.name.toLowerCase(), p]));
    },
    {},
  );

  return { repos, wire, calendar, posts, site, profile, languages, warnings, collectedAt: new Date().toISOString() };
}

/** Is the project's own site up, and does it publish a share image? */
export async function probe(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(12_000) });
    const html = res.ok ? (await res.text()).slice(0, 200_000) : '';
    const og = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*>/i)?.[0]?.match(/content=["']([^"']+)["']/i)?.[1];
    let ogImage = null;
    try {
      if (og) ogImage = new URL(og.replace(/&amp;/g, '&'), res.url).href;
    } catch {
      /* no usable image */
    }
    return { up: res.ok, status: res.status, ogImage, host: new URL(res.url).host };
  } catch {
    return { up: false, status: 0, ogImage: null, host: safeHost(url) };
  }
}

const safeHost = (u) => {
  try {
    return new URL(u).host;
  } catch {
    return '';
  }
};
