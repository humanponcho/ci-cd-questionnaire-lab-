// Section 1: Foundations + Path A (pull-request checks), part 1
// Each topic mirrors a lesson in the CI/CD & GitHub Actions lesson, adds an
// interactive tool (workflow analyzer / merge-gate simulator / terminal), and a quiz.

export const section1 = [
  /* ---------------------------------------------------------------- 01 */
  {
    id: 'what-cicd-is',
    group: 'Foundations',
    title: 'What CI/CD is',
    blocks: [
      { type: 'p', text: '**CI/CD** = **Continuous Integration** + **Continuous Deployment**. It is a set of **automatic checks** and **automatic release steps**. Checks run when you open a pull request. Release steps run when the change lands on `main`.' },
      { type: 'ul', items: [
        '**Continuous Integration** — every proposed change is automatically built and tested before it can merge.',
        '**Continuous Deployment** — once the change is on `main`, releasing it happens automatically too.',
        'Nobody starts the system by hand — **every path is event-driven**. Opening a PR, pushing to `main`, and a deployment reporting success are the triggers.',
      ]},
      { type: 'callout', kind: 'tip', text: 'One-line answer: **CI/CD is automatic checks on every proposed change, and automatic release steps once the change lands on `main` — all triggered by events, never started by hand.**' },
      { type: 'h2', text: 'Everything is event-driven', tag: 'simulated' },
      { type: 'p', text: 'This is a fake shell. Opening a pull request is an **event** — it starts the checks with no human pressing "go". Press ▶ Run demo.' },
      { type: 'terminal', name: 'bash', hint: 'try: gh pr create · gh pr checks', session: [
        { cmd: 'git push -u origin feature/add-coupon', out: [
          'Enumerating objects: 9, done.',
          'To github.com:acme/shop.git',
          ' * [new branch]  feature/add-coupon -> feature/add-coupon',
        ]},
        { cmd: 'gh pr create --base main --title "Add coupon codes"', out: [
          { t: 'https://github.com/acme/shop/pull/482', k: 'head' },
          { t: '→ event: pull_request → 7 workflows triggered automatically', k: 'ok' },
        ]},
        { cmd: 'gh pr checks 482', out: [
          { t: 'Validate Environment Schema   pending', k: 'warn' },
          { t: 'Run Fullstack Tests           pending', k: 'warn' },
          { t: 'Audit Dependencies            pending', k: 'warn' },
          { t: 'DI Guardrails (blocking)      pending', k: 'warn' },
          '(no one queued these — the PR event did)',
        ]},
      ]},
      { type: 'quiz', questions: [
        { q: 'What does CI/CD stand for?', options: ['Code Integration / Code Delivery', 'Continuous Integration / Continuous Deployment', 'Continuous Inspection / Continuous Debugging', 'Container Init / Container Deploy'], answer: 1,
          explain: 'Continuous Integration (checks on every change) + Continuous Deployment (automatic release when it lands on `main`).' },
        { q: 'How is the system started?', options: ['A maintainer runs it manually', 'On a fixed nightly schedule only', 'Automatically, by events (PR opened, push to main, deploy success)', 'By the hosting provider'], answer: 2,
          explain: 'Every path is event-driven. Opening a PR, pushing to main, and a successful deployment are the triggers.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 02 */
  {
    id: 'where-it-lives',
    group: 'Foundations',
    title: 'Where the system lives',
    blocks: [
      { type: 'p', text: '**GitHub Actions is the engine.** Each workflow is a YAML file under `.github/workflows/`. A workflow contains **jobs**; a job runs on a fresh virtual machine (a **runner**); each job contains **steps** (commands or reusable actions). All **13** workflow files sit in that one folder.' },
      { type: 'h2', text: 'The supporting files' },
      { type: 'table',
        head: ['File', 'Purpose'],
        rows: [
          ['`.github/dependabot.yml`', 'Schedules automatic dependency-update PRs'],
          ['`.github/CODEOWNERS`', 'Names reviewers for sensitive paths (advisory)'],
          ['`husky/pre-commit`', 'Local check before a commit is created'],
          ['`vercel.json`', 'Build, route, and schedule configuration for Vercel'],
        ]},
      { type: 'callout', text: 'The merge-protection rule itself is **not** a file in the repository — it is the organization ruleset `protect-main`, which lives in GitHub org settings.' },
      { type: 'terminal', name: 'bash', hint: 'try: ls .github/workflows', session: [
        { cmd: 'ls .github/workflows', out: [
          { t: 'vitest-ci.yml            deploy-production.yml', k: 'head' },
          'lint.yml                 smoke-tests.yml',
          'dependency-audit.yml     security.yml',
          'security-sast.yml        auto-merge.yml',
          'secret-scan.yml          di-compliance.yml',
          'container-scan.yml       docker-validation.yml',
          'reusable-*.yml',
          { t: '13 workflow files', k: 'ok' },
        ]},
        { cmd: 'ls .github', out: [
          'workflows/   dependabot.yml   CODEOWNERS',
        ]},
      ]},
      { type: 'quiz', questions: [
        { q: 'Where do GitHub Actions workflow files live?', options: ['/actions', '.github/workflows/', 'the repo root', '.ci/'], answer: 1,
          explain: 'Every workflow is a YAML file under `.github/workflows/`.' },
        { q: 'Where does the merge-protection rule actually live?', options: ['In a workflow file', 'In vercel.json', 'In the organization ruleset `protect-main`, outside the repo', 'In CODEOWNERS'], answer: 2,
          explain: 'The real gate is the org ruleset `protect-main`; the workflow files only produce the checks it requires.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 03 */
  {
    id: 'who-and-why',
    group: 'Foundations',
    title: 'Who uses it and why',
    blocks: [
      { type: 'p', text: 'You are the **only maintainer**. The system replaces a **second human reviewer** — the person who would normally catch mistakes before they reach the live shop. It stops three failure classes automatically, before they ship.' },
      { type: 'ul', items: [
        '**Broken tests** — code that fails the suite never merges or deploys.',
        '**Known-vulnerable dependencies** — a package with a public CVE is caught by the audit and scanners.',
        '**A leaked Prisma database client** — a stray `PrismaClient` instance that would exhaust the serverless connection pool is blocked.',
      ]},
      { type: 'callout', text: 'Framing: **the automation is the reviewer.** With one maintainer, the gate is what a colleague\'s "looks good, but…" would otherwise be.' },
      { type: 'quiz', questions: [
        { q: 'In this shop, what does the CI/CD system replace?', options: ['The hosting provider', 'A second human reviewer', 'The test framework', 'The database'], answer: 1,
          explain: 'With a single maintainer, the automated checks stand in for a second reviewer.' },
        { q: 'Which is NOT one of the three failure classes it stops?', options: ['Broken tests', 'Known-vulnerable dependencies', 'A leaked Prisma client', 'Slow page-load times'], answer: 3,
          explain: 'The three targeted classes are broken tests, vulnerable dependencies, and a leaked `PrismaClient`. Performance is not one of them.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 04 */
  {
    id: 'three-paths',
    group: 'Foundations',
    title: 'The three paths',
    blocks: [
      { type: 'p', text: 'Work flows through **three separate, automatic paths**. Each is started by a different event, and they hand off in order: checks gate the merge, the merge triggers the deploy, and a successful deploy triggers live tests.' },
      { type: 'code', name: 'the three paths', lang: 'text', code: `┌─ Path A ─ open a pull request ──────► checks run ──► merge gate
│
├─ Path B ─ push to main ─────────────► checks run again ──► migrate ──► deploy
│
└─ Path C ─ deployment reports success ► live smoke tests` },
      { type: 'ul', items: [
        '**Path A** — event `pull_request`: the checks run and the merge gate decides.',
        '**Path B** — event `push` to `main`: the checks run again, then the database migrates and the app deploys.',
        '**Path C** — event `deployment_status` = success: smoke tests run against the live URL.',
      ]},
      { type: 'callout', kind: 'tip', text: 'Right tool per need: **local pre-commit** for the fastest feedback, **required status checks** for the merge gate, **reusable workflows** for the deploy path, and **event-driven smoke tests** after the deployment is live.' },
      { type: 'quiz', questions: [
        { q: 'What triggers Path B (deployment)?', options: ['Opening a pull request', 'A push to `main`', 'A nightly schedule', 'A manual button'], answer: 1,
          explain: 'Path B runs on every push to `main` — which is what a merge produces.' },
        { q: 'Path C (live smoke tests) starts when…', options: ['tests pass on a PR', 'a deployment reports success', 'a branch is created', 'Dependabot opens a PR'], answer: 1,
          explain: 'Path C reacts to the `deployment_status` success event and tests the live deployment.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 05 */
  {
    id: 'path-a-checks',
    group: 'Path A — PR checks',
    title: 'Pull-request checks',
    blocks: [
      { type: 'p', text: 'Seven workflows react to a pull request against `main`. But only **four** of them are **required** by the `protect-main` ruleset and actually **block** the merge. The rest run and report, but a red result does not stop you merging.' },
      { type: 'table',
        head: ['Workflow', 'Job', 'Blocks merge?'],
        rows: [
          ['`vitest-ci.yml`', 'Validate Environment Schema', 'Yes'],
          ['`vitest-ci.yml`', 'Run Fullstack Tests', 'Yes'],
          ['`dependency-audit.yml`', 'Audit Dependencies', 'Yes'],
          ['`lint.yml`', 'DI Guardrails (blocking)', 'Yes'],
          ['`lint.yml`', 'Full Lint', 'No (report-only)'],
          ['`security-sast.yml`', 'Semgrep SAST', 'No'],
          ['`secret-scan.yml`', 'TruffleHog', 'No'],
          ['`container-scan.yml`', 'Trivy image scan', 'No (path-filtered)'],
          ['`docker-validation.yml`', 'Compose + production images', 'No (path-filtered)'],
          ['`di-compliance.yml`', 'DI Compliance', 'No'],
        ]},
      { type: 'h2', text: 'Drive the gate', tag: 'live' },
      { type: 'p', text: 'Click any check to flip it pass ⇄ fail. Watch what happens: turn **Semgrep** or **TruffleHog** red and the merge is still allowed. Turn **Run Fullstack Tests** red and it blocks. Only the four required checks are the gate.' },
      { type: 'gate', note: 'The ruleset also requires the branch to be up-to-date with `main`, blocks force-push and branch deletion, and sets required approvals = 0.',
        checks: [
          { name: 'Validate Environment Schema', workflow: 'vitest-ci.yml', required: true, status: 'pass' },
          { name: 'Run Fullstack Tests', workflow: 'vitest-ci.yml', required: true, status: 'pass' },
          { name: 'Audit Dependencies', workflow: 'dependency-audit.yml', required: true, status: 'pass' },
          { name: 'DI Guardrails (blocking)', workflow: 'lint.yml', required: true, status: 'pass' },
          { name: 'Full Lint', workflow: 'lint.yml', required: false, status: 'pass' },
          { name: 'Semgrep SAST', workflow: 'security-sast.yml', required: false, status: 'pass' },
          { name: 'TruffleHog', workflow: 'secret-scan.yml', required: false, status: 'pass' },
          { name: 'Trivy image scan', workflow: 'container-scan.yml', required: false, status: 'pass' },
        ]},
      { type: 'quiz', questions: [
        { q: 'How many pull-request checks actually block the merge?', options: ['All ten', 'Seven', 'Four', 'Zero'], answer: 2,
          explain: 'Only the four required checks in the `protect-main` ruleset block: env schema, fullstack tests, dependency audit, and DI Guardrails.' },
        { q: 'Semgrep reports a finding and goes red on a PR. Can you still merge?', options: ['No, any red check blocks', 'Yes — Semgrep is not a required check', 'Only an admin can', 'Only after re-running it'], answer: 1,
          explain: 'Semgrep is report-only for the merge gate. It (and the other non-required checks) do block the production deploy, though.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 06 */
  {
    id: 'vitest-ci',
    group: 'Path A — PR checks',
    title: 'The test workflow (vitest-ci.yml)',
    blocks: [
      { type: 'p', text: '`vitest-ci.yml` has **two jobs**, and the second **waits for** the first (`needs`). This is the heart of the merge gate — both jobs are required checks.' },
      { type: 'ul', items: [
        '**Validate Environment Schema** — writes a small script that imports `envSchema` and parses a complete set of fake values. It answers one question: does the schema still accept a valid configuration? It **fails fast** (~1 min) if a required variable was added without a deployment update.',
        '**Run Fullstack Tests** — starts a real **PostgreSQL 17** service container, installs the monorepo, rebuilds `sharp`, generates the Prisma client, migrates + seeds, writes `.env.ci` from secrets (with fallbacks), builds the frontend, then runs unit tests, integration tests, and finally starts the real server and runs the root Vitest suite (which contains the Stripe webhook test).',
      ]},
      { type: 'callout', text: 'Both Vitest configs use **wildcard include patterns**, so a brand-new test directory is never silently skipped.' },
      { type: 'h2', text: 'Analyze the workflow', tag: 'live' },
      { type: 'p', text: 'Press ▶ Analyze. The tool shows the two jobs and the `needs` edge — "Run Fullstack Tests" waits for "Validate Environment Schema". Try deleting the `needs:` line and re-analyze.' },
      { type: 'workflow', name: 'vitest-ci.yml', height: 320, code: `name: Vitest CI
on:
  pull_request:
    branches: [main]
  workflow_call:

jobs:
  validate-env:
    name: Validate Environment Schema
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: node scripts/validate-env.mjs

  fullstack-tests:
    name: Run Fullstack Tests
    needs: validate-env
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm rebuild sharp
      - run: npx prisma generate
      - run: npx prisma migrate deploy
      - run: npm run build
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test` },
      { type: 'quiz', questions: [
        { q: 'What does the "Validate Environment Schema" job prove?', options: ['That the database is reachable', 'That the env schema still accepts a valid configuration', 'That the frontend builds', 'That secrets are set'], answer: 1,
          explain: 'It parses a complete set of fake values against `envSchema` — a fast check that a newly required variable was not forgotten.' },
        { q: 'Why do the Vitest configs use wildcard include patterns?', options: ['To run faster', 'So a new test directory is never silently skipped', 'To skip slow tests', 'To enforce coverage'], answer: 1,
          explain: 'Wildcards mean newly added test folders are picked up automatically instead of being missed.' },
      ]},
    ],
  },
]
