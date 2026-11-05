# How this profile updates itself

The profile at [github.com/tejalgoyal2](https://github.com/tejalgoyal2) rebuilds every Monday. Nothing on it is edited by hand except `config.json`. It uses GitHub's own colours (Primer, light and dark), typefaces (Mona Sans and Monaspace) and component shapes, so it looks at home on GitHub.

## The loop

`.github/workflows/edition.yml` runs `node scripts/build.mjs` on a schedule (Mondays 13:17 UTC), on every change to the config or the generator, and on demand (Actions tab → *Print the edition* → *Run workflow*). It commits only when something changed.

1. **Collect** (`scripts/collect.mjs`): public repos, their languages, the newest real commits, the contribution calendar, the blog's feed, my avatar, and what tgoyal.me's own MCP server says about my projects.
2. **Choose** (`scripts/select.mjs`):
   - *Featured projects*: the repos named in `config.json → lead`, in that order.
   - *Recently shipped*: anything else pushed to in the last 45 days that has a description, a site or topics. **A new repo shows up here by itself.**
   - *More projects*: every other repo with something to say.
   - Forks, archived, private and hidden repos, and GitHub-course repos never show.
3. **Picture** (`scripts/previews.mjs`): each card's banner is the project's own share image (`og:image`) if it has one, else a screenshot of its live site, else a generated cover: a commit-grid in the colour of its main language. Pictures live in `assets/shots/` and are only replaced when they visibly change.
4. **Draw** (`scripts/render.mjs`): the hero (an isometric skyline of the year's contributions), cards, the git graph of recent commits, the year in numbers with a language bar. Every word is an outline, so nothing depends on the viewer's fonts. Each piece is drawn twice, light and dark.
5. **Write** (`scripts/readme.mjs`): the README, with every picture also present as text (alt text, a table, lists), because that is what search engines and AI models read.

## What to edit

| I want to… | Do this |
| :-- | :-- |
| Feature a different project | change `lead` in `config.json` |
| Hide a repo | add it to `hide` |
| Fix a blurb, title, live URL or picture | add an entry under `repos` (`blurb`, `title`, `live`, `image`, `preview`: `og`, `shot` or `cover`) |
| Show a repo that has no description | give it a description on GitHub, or add a `blurb` under `repos` |
| Change the tagline, chips or bio | `tagline`, `chips`, `about` in `config.json` |
| Count Jupyter notebooks in the language bar | set `"countNotebooks": true` |

Each run's summary (on the run's page in the Actions tab) says which repos were left out and why, and which cards fell back to a generated cover.

## Optional: private contributions

The built-in token only sees public data. To count private contributions, add a fine-grained personal access token as the repo secret `PROFILE_TOKEN` (read-only; nothing else is needed).

## Running it locally

```bash
npm ci
GITHUB_TOKEN=$(gh auth token) npm run print   # everything, fresh
npm run print:cached                           # redraw from the last run's data, offline
npm test
```

## Credits

Type: [Mona Sans](https://github.com/github/mona-sans) and [Monaspace](https://github.com/githubnext/monaspace), GitHub's own typefaces, under the [SIL Open Font License](https://openfontlicense.org), in `assets/fonts`. Language colours are GitHub's (linguist).
