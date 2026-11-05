// Which repos go where. Pure functions, so the rules are tested (tests/select.test.mjs).
//
//   On the front page  the repos named in config.lead, in that order: the curated six.
//   Hot off the press  anything else public that was pushed lately and has something to say,
//                      found by itself, so a new repo shows up without touching this repo.
//   In brief           every other repo with a description, newest first.
//
// A repo with nothing to say (no description, no site, no topics, no config entry) stays out
// and is named in the run's summary, so it's clear why it's missing and how to bring it in.

const COURSEWORK = /^(skills-|introduction-to-github$)/;

export function select({ repos, config, now = new Date() }) {
  const cfg = config.repos || {};
  const hide = new Set([...(config.hide || []), config.user]);
  const base = repos.filter((r) => !r.fork && !r.archived && !r.private && !hide.has(r.name) && !COURSEWORK.test(r.name));
  const hasSomethingToSay = (r) => !!(cfg[r.name]?.blurb || r.description || r.homepage || r.topics.length);

  const byName = new Map(base.map((r) => [r.name, r]));
  const leads = (config.lead || []).map((n) => byName.get(n)).filter(Boolean);
  const missingLeads = (config.lead || []).filter((n) => !byName.has(n));
  const used = new Set(leads.map((r) => r.name));

  const sayers = base.filter((r) => !used.has(r.name) && hasSomethingToSay(r));
  const recent = (r) => (now - new Date(r.pushed)) / 864e5 <= (config.freshDays ?? 45);
  const fresh = sayers.filter(recent).sort((a, b) => b.pushed.localeCompare(a.pushed)).slice(0, config.freshMax ?? 4);
  fresh.forEach((r) => used.add(r.name));
  const brief = sayers.filter((r) => !used.has(r.name)).sort((a, b) => b.pushed.localeCompare(a.pushed));
  const silent = base.filter((r) => !used.has(r.name) && !hasSomethingToSay(r) && !brief.includes(r)).map((r) => r.name);

  return { leads, fresh, brief, silent, missingLeads };
}


/** What a repo is called, what it says, and where its card links. The site's own words win when the site answers. */
export function describe(repo, { config, site = {}, probe, now = new Date() }) {
  const o = config.repos?.[repo.name] || {};
  const known = site[(o.site || repo.name).toLowerCase()];
  const homepage = o.live || repo.homepage || '';
  return {
    name: repo.name,
    owner: config.user,
    title: o.title || known?.name || repo.name,
    blurb: (known?.description || o.blurb || repo.description || '').trim(),
    lang: o.lang || repo.language,
    stars: repo.stars,
    forks: repo.forks || 0,
    topics: repo.topics || [],
    pushed: repo.pushed,
    created: repo.created,
    repoUrl: repo.url,
    href: homepage || repo.url,
    host: homepage ? probe?.host || new URL(homepage).host : '',
    live: !!probe?.up,
    isNew: (now - new Date(repo.created)) / 864e5 <= 45,
    preview: o.preview || 'auto',
    homepage,
  };
}
