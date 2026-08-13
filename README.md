# CI/CD Questionnaire Lab

A hands-on, build-it-yourself study app covering a **production CI/CD system** built on GitHub Actions — the three automatic paths (PR checks → merge gate → deploy → live smoke tests), the workflows that drive them, and the traps that actually take production down. Instead of just reading, you *operate* it: a workflow-YAML analyzer, an interactive merge-gate simulator, and a simulated Actions terminal — all in the browser — plus a self-check quiz per topic.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default http://localhost:5175). It opens automatically.

To make a production build:

```bash
npm run build && npm run preview
```

> Everything runs in the browser. There is **no runner or daemon** — the terminal replays realistic output, and the workflow tool parses and analyzes your YAML client-side.

## What's inside

**16 topics across 5 sections**, in lesson order:

- **Foundations** — What CI/CD is, Where the system lives, Who uses it and why, The three paths
- **Path A — PR checks** — the pull-request checks, `vitest-ci.yml`, `lint.yml`, the other scanners, the merge gate
- **Path B — Deployment** — the deploy workflow, the concurrency trap, the deploy job itself
- **Path C & Support** — live smoke tests, supporting machinery (Dependabot, Husky, cron), the current shape
- **Self-Check** — recap questions

Each topic has three parts: **read the concept → run the tool → test yourself.**

## How the interactive tools work

- **Workflow Lab** (`src/playgrounds/WorkflowLab.jsx`) — parses a GitHub Actions workflow YAML client-side (via `src/lib/yaml.js`), lists its **triggers** and **jobs** (the `needs` graph, reusable-workflow calls, step counts, report-only `continue-on-error` jobs), and lints the real traps from the lesson: the `${{ github.workflow }}` concurrency collision, and secrets written into a tracked file. Edit it, press **▶ Analyze**.
- **Merge Gate** (`src/playgrounds/MergeGate.jsx`) — an interactive `protect-main` simulator. Click any PR check to flip it pass ⇄ fail and watch the verdict. Proves the gate is deliberately narrow: only the **four required** checks block the merge.
- **Terminal** (`src/playgrounds/Terminal.jsx`) — a *simulated* shell for `git` / `gh` / `vercel` / `npm` and Actions run logs. Press **▶ Run demo**, or type one of the commands.

## Editing content

All topic content is authored as data in `src/data/topics-1.js` … `topics-3.js`. Each block is `{ type: 'p' | 'ul' | 'h2' | 'callout' | 'table' | 'code' | 'terminal' | 'workflow' | 'gate' | 'quiz', ... }`. Add or edit a topic there and it appears in the sidebar automatically.

## Progress

Topics you mark "understood" are saved in `localStorage`, and the sidebar tracks your completion percentage.

## Project structure

```
src/
  App.jsx                  sidebar, progress, home, topic view, nav
  components/
    Blocks.jsx             maps content-block data → UI
    CodeBlock.jsx          read-only, lightly highlighted code panels
    Table.jsx              simple data tables
    Quiz.jsx               self-check quiz with feedback
  playgrounds/
    Terminal.jsx           simulated CI shell
    WorkflowLab.jsx        workflow YAML analyzer + linter
    MergeGate.jsx          interactive required-checks gate simulator
  lib/
    yaml.js                tolerant YAML-subset parser
  data/
    topics.js              combines sections, builds sidebar groups
    topics-1..3.js         the syllabus content
  styles.css               visual system
```

## Deploy to GitHub Pages

A workflow at `.github/workflows/deploy.yml` builds and publishes on every push to `main`. In the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. The site is then served at `https://<user>.github.io/ci-cd-questionnaire-lab-/`.

## Credits

Structure and visual system adapted from the Dev Questionnaire Lab. Content based on a real production monorepo CI/CD setup.
