// Section 2: Path A (part 2) + Path B (deployment)

export const section2 = [
  /* ---------------------------------------------------------------- 07 */
  {
    id: 'lint-workflow',
    group: 'Path A — PR checks',
    title: 'The lint workflow — two strictness levels',
    blocks: [
      { type: 'p', text: '`lint.yml` deliberately **splits into two jobs** with different strictness, because linting the whole codebase strictly would block every PR — but one specific lint rule protects production and must block.' },
      { type: 'ul', items: [
        '**DI Guardrails (blocking)** — runs a narrow ESLint config containing only the **dependency-injection** and **Prisma** rules. A leaked `PrismaClient` instance exhausts the connection pool on serverless; this gate prevents that exact production failure. It is a **required** check.',
        '**Full Lint (report-only)** — runs the complete ESLint pass with `continue-on-error: true` and writes error/warning counts to the job summary. The backlog is large, so blocking on it would stop every PR.',
      ]},
      { type: 'h2', text: 'Spot the report-only job', tag: 'live' },
      { type: 'p', text: 'Press ▶ Analyze. The tool marks **Full Lint** as `report-only` (because of `continue-on-error: true`) and warns that a ruleset must not rely on it. Remove that line and re-analyze to see the badge disappear.' },
      { type: 'workflow', name: 'lint.yml', height: 300, code: `name: Lint
on:
  pull_request:
    branches: [main]

jobs:
  di-guardrails:
    name: DI Guardrails (blocking)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx eslint --config .eslintrc.di.cjs "src/**/*.ts"

  full-lint:
    name: Full Lint
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx eslint . --format compact | tee lint.txt
      - run: node scripts/lint-summary.mjs >> "$GITHUB_STEP_SUMMARY"` },
      { type: 'callout', kind: 'warn', text: 'A leaked `PrismaClient` on serverless opens a new connection per invocation and **exhausts the pool**. That is why the DI rule is a hard, required gate rather than report-only.' },
      { type: 'quiz', questions: [
        { q: 'Why is "Full Lint" set to `continue-on-error: true`?', options: ['It is broken', 'The backlog is large, so blocking every PR on it is impractical — it reports instead', 'To make it run faster', 'To skip it entirely'], answer: 1,
          explain: 'Full Lint is report-only: it surfaces counts without blocking, because the existing backlog would otherwise stop every PR.' },
        { q: 'Why is "DI Guardrails" a hard blocking gate?', options: ['Linting must always block', 'A leaked PrismaClient exhausts the serverless connection pool — a real production failure', 'It runs the fastest', 'It is required by npm'], answer: 1,
          explain: 'The narrow DI/Prisma rules catch a leaked client that would take production down, so they block the merge.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 08 */
  {
    id: 'other-pr-checks',
    group: 'Path A — PR checks',
    title: 'Other pull-request checks',
    blocks: [
      { type: 'p', text: 'The remaining PR workflows are the security and validation layer. None of them block the merge, but they **do** block the production deploy (Path B), so a red result still matters.' },
      { type: 'table',
        head: ['Check', 'What it does'],
        rows: [
          ['**Semgrep**', 'Static analysis with `p/javascript`, `p/nodejs`, and `p/owasp-top-ten` packs; **any** finding fails the job.'],
          ['**TruffleHog**', 'Full-history secret scan; only **verified** (live) secrets are reported.'],
          ['**Trivy**', 'Builds both Docker images and fails on CRITICAL/HIGH CVEs **that have a fix** (honours `.trivyignore`).'],
          ['**Dependency audit**', 'A single `better-npm-audit` run against the root lockfile.'],
          ['**Docker validation**', 'Starts the full compose stack and asserts the real `/health` response contains `"database":"connected"`; also boots both production image targets.'],
          ['**DI compliance**', 'Scans changed files on PRs, everything on `main`; uploads the report as an artifact.'],
        ]},
      { type: 'terminal', name: 'bash', hint: 'try: trivy image · curl /health', session: [
        { cmd: 'trivy image --severity CRITICAL,HIGH --ignore-unfixed shop:web', out: [
          'shop:web (debian 12)',
          { t: 'Total: 0 (CRITICAL: 0, HIGH: 0)', k: 'ok' },
          '(unfixed CVEs ignored; .trivyignore honoured)',
        ]},
        { cmd: 'curl -s localhost:3000/health', out: [
          { t: '{"status":"ok","database":"connected"}', k: 'ok' },
          '→ docker-validation asserts "database":"connected"',
        ]},
      ]},
      { type: 'quiz', questions: [
        { q: 'What does TruffleHog report?', options: ['Every string that looks like a secret', 'Only verified (live) secrets', 'Failing tests', 'Large files'], answer: 1,
          explain: 'It scans full history but reports only verified/live secrets, cutting false positives.' },
        { q: 'These non-required checks are red. What still happens?', options: ['Nothing, they are ignored', 'They block the production deploy even though they do not block the merge', 'They delete the branch', 'They auto-fix the code'], answer: 1,
          explain: 'They are advisory for the merge gate but required by the deploy path, so a red result blocks the release.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 09 */
  {
    id: 'merge-gate',
    group: 'Path A — PR checks',
    title: 'The merge gate',
    blocks: [
      { type: 'p', text: 'The `protect-main` ruleset requires **exactly these four** checks — nothing more. This is the real gate. Everything else can be red on the PR without stopping the merge.' },
      { type: 'gate', note: 'Extra rules: the branch must be **up-to-date with `main`**, force-push and branch deletion are **blocked**, and required approvals = **0**. Repository admins can always bypass — so the four checks are the real gate for everyone else.',
        checks: [
          { name: 'Validate Environment Schema', workflow: 'vitest-ci.yml', required: true, status: 'pass' },
          { name: 'Run Fullstack Tests', workflow: 'vitest-ci.yml', required: true, status: 'pass' },
          { name: 'Audit Dependencies', workflow: 'dependency-audit.yml', required: true, status: 'pass' },
          { name: 'DI Guardrails (blocking)', workflow: 'lint.yml', required: true, status: 'pass' },
        ]},
      { type: 'callout', text: 'Because required approvals = 0, the automation **is** the approval. The four green checks are what let the change land — there is no human sign-off step.' },
      { type: 'quiz', questions: [
        { q: 'How many required checks does `protect-main` demand?', options: ['Two', 'Exactly four', 'Ten', 'One per workflow'], answer: 1,
          explain: 'Exactly four: Validate Environment Schema, Run Fullstack Tests, Audit Dependencies, and DI Guardrails (blocking).' },
        { q: 'What is the required-approvals count?', options: ['1', '2', '0 — the checks are the approval', 'It depends on the file'], answer: 2,
          explain: 'Required approvals = 0. With one maintainer, the four automated checks stand in for a reviewer.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 10 */
  {
    id: 'path-b-deploy',
    group: 'Path B — Deployment',
    title: 'The deployment workflow',
    blocks: [
      { type: 'p', text: '`deploy-production.yml` triggers on **every push to `main`**. Its concurrency group is `deploy-production` with `cancel-in-progress: false`, so deploys **queue** instead of cancelling each other. First it calls **five reusable workflows in parallel** — all must pass before the deploy job runs.' },
      { type: 'code', name: 'the deploy fan-out', lang: 'text', code: `ci (vitest-ci) ─┐
security-scan ──┤
dependency-audit┼──► all must pass ──► deploy
secret-scan ────┤
container-scan ─┘` },
      { type: 'callout', text: '**Container-scan is forced** here (no path filter), so the Docker images are always rebuilt and scanned on a deploy — even if no Docker files changed in the push.' },
      { type: 'h2', text: 'Analyze the deploy workflow', tag: 'live' },
      { type: 'p', text: 'Press ▶ Analyze. You will see five `reusable call` jobs plus a `deploy` job whose `needs` lists all five — the fan-in.' },
      { type: 'workflow', name: 'deploy-production.yml', height: 320, code: `name: Deploy to Production
on:
  push:
    branches: [main]

concurrency:
  group: deploy-production
  cancel-in-progress: false

jobs:
  ci:
    uses: ./.github/workflows/vitest-ci.yml
    secrets: inherit
  security-scan:
    uses: ./.github/workflows/security-sast.yml
    secrets: inherit
  dependency-audit:
    uses: ./.github/workflows/dependency-audit.yml
  secret-scan:
    uses: ./.github/workflows/secret-scan.yml
  container-scan:
    uses: ./.github/workflows/container-scan.yml

  deploy:
    needs: [ci, security-scan, dependency-audit, secret-scan, container-scan]
    runs-on: ubuntu-latest
    steps:
      - run: echo "all gates green — deploying"` },
      { type: 'quiz', questions: [
        { q: 'Why `cancel-in-progress: false` on the deploy?', options: ['To run deploys faster', 'So deploys queue instead of cancelling each other', 'To allow parallel deploys', 'It disables concurrency'], answer: 1,
          explain: 'Queuing prevents a newer push from killing an in-flight production deploy mid-way.' },
        { q: 'Before the deploy job runs, what must happen?', options: ['One reusable workflow passes', 'All five reusable workflows pass', 'A manual approval', 'Nothing — it deploys immediately'], answer: 1,
          explain: 'The `deploy` job `needs` all five reusable workflows; every one must pass first.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 11 */
  {
    id: 'concurrency-trap',
    group: 'Path B — Deployment',
    title: 'The concurrency trap',
    blocks: [
      { type: 'p', text: 'This bug took the production deploy **down**. Reusable workflows put `${{ github.workflow }}` in their concurrency-group name. But during a `workflow_call`, that value becomes the **caller\'s** name ("Deploy to Production"). So a standalone run of the reusable workflow and the embedded run inside the deploy **shared one group** — and cancelled each other, killing the deploy.' },
      { type: 'h2', text: 'See the analyzer flag it', tag: 'live' },
      { type: 'p', text: 'This reusable workflow (`workflow_call`) sets its concurrency group from `${{ github.workflow }}`. Press ▶ Analyze — the tool warns about the exact collision.' },
      { type: 'workflow', name: 'security-sast.yml', height: 230, code: `name: Security SAST
on:
  pull_request:
    branches: [main]
  workflow_call:

concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  semgrep:
    name: Semgrep SAST
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: semgrep ci --config p/javascript --config p/owasp-top-ten` },
      { type: 'callout', kind: 'warn', text: 'The fix: give the reusable and standalone runs **distinct group names**. The cost is honest — a push to `main` now does duplicate work (the standalone run **and** the embedded run), but the deploy no longer cancels itself.' },
      { type: 'quiz', questions: [
        { q: 'During a `workflow_call`, what does `${{ github.workflow }}` resolve to?', options: ['The reusable workflow\'s own name', 'The caller\'s workflow name', 'An empty string', 'A random id'], answer: 1,
          explain: 'It becomes the caller\'s name, so the embedded run shares a concurrency group with the standalone run.' },
        { q: 'What was the cost of the fix?', options: ['Slower runners', 'Duplicate work on every push to `main`', 'Losing the security scan', 'Nothing'], answer: 1,
          explain: 'Splitting the group names means the standalone and embedded runs both execute — duplicate work, but no self-cancelling deploy.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 12 */
  {
    id: 'deploy-job',
    group: 'Path B — Deployment',
    title: 'The deploy job itself',
    blocks: [
      { type: 'p', text: 'Once the five gates are green, the deploy job runs seven steps. The critical ordering rule: **migrations run before the new code is live**, so every migration must stay backward-compatible with the currently running release (**expand/contract** discipline).' },
      { type: 'h2', text: 'Watch a deploy run', tag: 'simulated' },
      { type: 'terminal', name: 'deploy job', hint: 'press ▶ Run demo to replay the seven steps', session: [
        { cmd: 'vercel pull --yes --environment=production', out: ['Downloaded project settings to .vercel/'] },
        { cmd: 'vercel build --prod', out: [
          { t: 'Build completed on the runner → .vercel/output', k: 'ok' },
        ]},
        { cmd: '# 3. Diagnose Database Connection (DNS + TCP)', out: [
          'resolving ep-cool-db.eu.neon.tech ... 52.x.x.x',
          { t: 'TCP 5432 reachable', k: 'ok' },
        ]},
        { cmd: '# 4. Wake Neon Database (retry TCP up to 20x)', out: [
          'attempt 1: connection refused', 'attempt 2: connection refused',
          { t: 'attempt 3: awake', k: 'ok' },
        ]},
        { cmd: 'prisma migrate deploy   # uses PRODUCTION_DIRECT_URL (never the pooler)', out: [
          { t: '3 migrations applied (attempt 1/3)', k: 'ok' },
          'migrations run BEFORE new code is live → must be backward-compatible',
        ]},
        { cmd: 'vercel deploy --prebuilt --prod', out: [
          { t: 'https://shop-9f3ax2.vercel.app', k: 'head' },
        ]},
        { cmd: '# 7. Smoke test that exact URL (up to 6 retries)', out: [
          'GET https://shop-9f3ax2.vercel.app/health → 200',
          { t: 'deploy succeeded', k: 'ok' },
        ]},
      ]},
      { type: 'callout', kind: 'warn', text: 'Because migrations apply **before** the new code goes live, a destructive migration (dropping a column the old code still reads) breaks the running release. Expand first (add), deploy, then contract (remove) in a later release.' },
      { type: 'quiz', questions: [
        { q: 'Why must every migration be backward-compatible?', options: ['GitHub requires it', 'Migrations run before the new code is live, so the old release must still work against the new schema', 'To make deploys faster', 'To avoid using the pooler'], answer: 1,
          explain: 'Migrations apply first; until the new code is live the current release runs against the migrated schema — hence expand/contract.' },
        { q: 'Which URL does `prisma migrate deploy` use?', options: ['The pooled connection URL', '`PRODUCTION_DIRECT_URL` — never the pooler', 'localhost', 'The Vercel preview URL'], answer: 1,
          explain: 'Migrations use the direct connection (`PRODUCTION_DIRECT_URL`), not the pooler.' },
      ]},
    ],
  },
]
