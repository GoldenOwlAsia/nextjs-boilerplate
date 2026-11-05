# Git flow

How work gets from an idea to `main`. Written for humans and for AI agents: an agent that reads only
this file should be able to branch, commit and open a PR the way the team does.

The flow is **trunk-based with short-lived branches**. `main` is the only long-lived branch; every
change reaches it through a pull request.

```text
main ──●───────────────●──────────────●───────▶
        \             / \            /
         feat/x ●──●─●   fix/y ●──●─●
```

What the repository history shows today: branches named `setup/…` and `docs/…`, commit subjects like
`setup: add pkgs` and `chore: structure docs`, and every branch merged to `main` as a GitHub merge
commit (`Merge pull request #N from GoldenOwlAsia/…`). The rules below keep that and fill in the
gaps; the last column of each table says whether a rule is **enforced** by tooling or a
**convention** that relies on people.

---

## 1. Branches

| Rule                                                  | Kind       |
| ----------------------------------------------------- | ---------- |
| Branch from an up-to-date `main`                      | convention |
| Name: `<type>/<kebab-case-description>`               | convention |
| One purpose per branch; short-lived (days, not weeks) | convention |
| Delete the branch after the PR is merged              | convention |
| Nothing is committed to `main` directly               | convention |

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `ci`, `chore`, `setup`.

- `setup` — project scaffolding and tooling (the type the history already uses).
- `chore` — maintenance that changes no behaviour: dependency bumps, config, security patches.
- Descriptions say what, not who or when: `fix/proxy-drops-cookies`, not `fix/john-bug`.

```bash
git switch main && git pull --ff-only
git switch -c feat/trip-search
```

Verify in the GitHub repository settings that `main` is protected (require a PR, require the CI
checks, block force-push). The repo cannot enforce this by itself, so treat the list above as the
policy even where the setting is missing.

---

## 2. Commits

Format: `<type>: <summary>` — same types as branches, lowercase, imperative, no trailing period,
about 72 characters at most.

```text
feat: add trip search filters
fix: forward cookies through the BFF proxy
chore: bump node to 22.23.4
```

- One logical change per commit. A commit that mixes a refactor with a behaviour change is hard to
  review and impossible to revert cleanly: refactor first, then change behaviour.
- The body (optional) explains **why**, not what — the diff already shows what.
- Do not commit `.env*` files other than `.env.example`, build output, or `test-results/`.
- Commits made with an AI tool keep the `Co-Authored-By` trailer the tool adds.

### What runs on commit

`husky` installs a `pre-commit` hook (via the `prepare` script, so `pnpm install` is enough). It runs
`lint-staged` on the staged files: `eslint --fix` and `prettier --write` for code, `prettier --write`
for json/md/css/yaml. **Enforced**, but only locally.

Never bypass it with `--no-verify`. If the hook fails, fix the cause; CI would reject the same
change anyway.

---

## 3. Before you open a PR

```bash
pnpm check        # typecheck + lint + format:check + unit tests
pnpm build        # when you touched config, routing, or dependencies
pnpm test:e2e     # when you touched routing or a rendered page
pnpm audit:prod   # when you touched dependencies
```

Then rebase or merge the latest `main` into your branch so the PR is tested against what will
actually land.

---

## 4. Pull requests

| Rule                                                                    | Kind       |
| ----------------------------------------------------------------------- | ---------- |
| Target `main`                                                           | convention |
| Title follows the commit format: `type: summary`                        | convention |
| Small: aim for under ~400 changed lines of production code              | convention |
| Description says **what** changed, **why**, and **how you verified it** | convention |
| CI is green before merge                                                | convention |
| At least one approving review                                           | convention |
| Merge with a merge commit; delete the branch afterwards                 | convention |

If a change is bigger than that, split it: tests first, then the refactor with tests unchanged, then
the behaviour change. Review quality drops sharply with size.

Description template:

```markdown
## What

One or two sentences.

## Why

The problem or decision behind it.

## How I verified it

Commands run, pages checked, screenshots for UI changes.

## Notes for the reviewer

Risky spots, follow-ups, anything deliberately left out.
```

### CI gates (`.github/workflows/ci.yml`)

Runs on every PR and every push to `main`. **Enforced** — a red check means the PR is not ready.

| Job   | Steps                                                                              |
| ----- | ---------------------------------------------------------------------------------- |
| check | `pnpm install --frozen-lockfile` → `pnpm audit:prod` → `pnpm check` → `pnpm build` |
| e2e   | install → Playwright Chromium → `pnpm test:e2e`                                    |

`pnpm audit:prod` fails the build on any known vulnerability in production dependencies. If it
fails on something you did not touch, a new advisory was published: bump the package in a separate
`chore:` PR rather than hiding it in a feature.

---

## 5. Dependencies and the lockfile

- Dependabot opens weekly PRs for npm and GitHub Actions (`.github/dependabot.yml`). It does **not**
  update `.nvmrc`; bump Node by hand and keep `.nvmrc`, `engines` and `docs/tooling.md` in step.
- `pnpm-lock.yaml` is committed and CI installs with `--frozen-lockfile`. Change dependencies only
  with `pnpm add` / `pnpm update` and commit the lockfile in the same commit as `package.json`.
- Security patches go in their own `chore:` PR so they can be reviewed, merged and reverted alone.

---

## 6. Hotfixes

Same flow, faster: branch from `main` as `fix/<description>`, keep the diff minimal, open the PR
marked urgent. There is no separate `hotfix` or `release` branch — `main` is always what ships.

---

## 7. Rules for AI agents

These apply to any coding agent working in this repository.

1. **Do not commit, push, open a PR, or merge unless the user asked for it.** Edits in the working
   tree are the default outcome of a task.
2. **Never commit to `main`.** If you are on `main` and asked to commit, create a branch first
   (§1 naming).
3. Run `git status` and `git diff --stat` before staging. Stage files by name; avoid `git add -A`
   when unrelated changes exist (for example the block `next dev` rewrites in `AGENTS.md`).
4. Run `pnpm check` before declaring work done (see `AGENTS.md`). Report failures with their
   output; do not describe a failing run as passing.
5. Never use `--no-verify`, `--force` on a shared branch, `git reset --hard`, or `git clean -f`
   without the user's explicit approval for that specific action.
6. Do not edit CI, hooks, or this document to make a failing check pass. Fix the cause or ask.
7. Never commit secrets. `.env*` is gitignored except `.env.example`.
8. When a rule here conflicts with an explicit instruction from the user, follow the user and say
   which rule you are departing from.

---

## 8. Quick reference

```bash
git switch main && git pull --ff-only          # start from current main
git switch -c <type>/<description>             # new branch
# ...work...
pnpm check                                     # before every push
git add <files> && git commit -m "<type>: <summary>"
git push -u origin <type>/<description>
gh pr create --base main                       # then fill in the template
```
