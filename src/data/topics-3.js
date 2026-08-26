// Section 3: Path C (live smoke tests) + Supporting machinery + Current shape + Self-Check

export const section3 = [
  /* ---------------------------------------------------------------- 13 */
  {
    id: 'smoke-tests',
    group: 'Path C & Support',
    title: 'Live smoke tests',
    blocks: [
      { type: 'p', text: '`smoke-tests.yml` is **Path C**. It triggers on the `deployment_status` event — but only when the state is `success` **and** the environment is `production`. It waits for the environment URL, runs `npm run test:smoke` against the **live** deployment, and uploads `smoke.log`.' },
      { type: 'callout', text: 'Secrets are injected only via an `env:` block — **never** written to a tracked file. That is the safe pattern: the value lives in the step\'s environment for the duration of the run and nowhere on disk.' },
      { type: 'h2', text: 'Analyze the smoke workflow', tag: 'live' },
      { type: 'p', text: 'Press ▶ Analyze. Note the `deployment_status` trigger and that no check warns about secrets — because they come through `env:`, not a file. Try changing the `run` step to `echo "$STRIPE_KEY" >> .env` and re-analyze to trip the warning.' },
      { type: 'workflow', name: 'smoke-tests.yml', height: 300, code: `name: Smoke Tests
on:
  deployment_status:

jobs:
  smoke:
    name: Live smoke tests
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Run smoke tests against the live URL
        env:
          SMOKE_BASE_URL: \${{ github.event.deployment_status.environment_url }}
          STRIPE_TEST_KEY: \${{ secrets.STRIPE_TEST_KEY }}
        run: npm run test:smoke
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: smoke-log
          path: smoke.log` },
      { type: 'terminal', name: 'bash', hint: 'try: npm run test:smoke', session: [
        { cmd: 'npm run test:smoke', out: [
          'SMOKE_BASE_URL=https://shop-9f3ax2.vercel.app',
          '✓ homepage returns 200',
          '✓ /health reports database connected',
          '✓ checkout creates a Stripe session',
          { t: '3 passed — smoke.log uploaded as an artifact', k: 'ok' },
        ]},
      ]},
      { type: 'quiz', questions: [
        { q: 'What event triggers the live smoke tests?', options: ['push to master', 'pull_request', 'deployment_status (success, production)', 'schedule'], answer: 2,
          explain: 'Path C reacts to `deployment_status` when state is success and the environment is production.' },
        { q: 'How are secrets given to the smoke step?', options: ['Written to .env', 'Committed to the repo', 'Through an `env:` block only', 'Printed to the log'], answer: 2,
          explain: 'Secrets are injected via `env:` for the run and never persisted to a tracked or uploaded file.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 14 */
  {
    id: 'supporting-machinery',
    group: 'Path C & Support',
    title: 'Supporting machinery',
    blocks: [
      { type: 'p', text: 'Around the three paths sit several supporting pieces that keep dependencies current and add a fast local gate.' },
      { type: 'table',
        head: ['Piece', 'Behaviour'],
        rows: [
          ['**Dependabot**', 'Monthly npm, weekly Actions + Dockerfiles. Major updates ignored. Cooldown 3–14 days by severity (supply-chain defence). **Security updates are never delayed.**'],
          ['**Auto-merge**', 'Squash auto-merge for **patch** updates opened by `dependabot[bot]` only — and still waits for the four required checks.'],
          ['**`.npmrc` cooldown**', '`min-release-age=7` (enforced only where npm ≥ 11.10).'],
          ['**Husky pre-commit**', 'Greps for new `PrismaClient` constructions — a local, fast copy of the DI Guardrails gate.'],
          ['**Vercel cron**', '`/api/health/redis-ping` every Monday 09:00 UTC; also pins `maxDuration: 30` and the full security-header set.'],
        ]},
      { type: 'h2', text: 'The pre-commit hook (fastest feedback)' },
      { type: 'code', name: 'husky/pre-commit', lang: 'bash', code: `#!/usr/bin/env sh
# Local mirror of the DI Guardrails gate — catch a leaked client
# before the commit is even created (seconds, not a CI round-trip).
if git diff --cached --name-only -z | xargs -0 grep -nE 'new PrismaClient\\(' ; then
  echo "✗ New PrismaClient() detected. Import the shared instance instead."
  exit 1
fi` },
      { type: 'code', name: '.github/dependabot.yml', lang: 'yaml', code: `version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: monthly
    cooldown:
      default-days: 7
    ignore:
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly` },
      { type: 'quiz', questions: [
        { q: 'What is the point of the Husky pre-commit hook?', options: ['It deploys the app', 'It gives the fastest feedback — a local copy of the DI gate before a commit exists', 'It runs the full test suite', 'It merges PRs'], answer: 1,
          explain: 'It greps for a new `PrismaClient` locally, catching the mistake in seconds instead of a CI round-trip.' },
        { q: 'How does Dependabot treat security updates?', options: ['Delayed by the cooldown like everything else', 'Ignored', 'Never delayed', 'Only monthly'], answer: 2,
          explain: 'The cooldown is a supply-chain defence for routine updates; security updates are never delayed.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 15 */
  {
    id: 'current-shape',
    group: 'Path C & Support',
    title: 'Current shape — deliberate properties',
    blocks: [
      { type: 'p', text: 'Some things about this system look like defects but are **deliberate trade-offs**. Knowing which is which is the point of the review.' },
      { type: 'ul', items: [
        '**The merge gate is intentionally narrow.** Several security and validation workflows can go red without blocking the merge — but they **do** block the production deploy.',
        '**A push to `master` runs the heavy work twice** (standalone + reusable) — the accepted cost of the concurrency-group fix.',
        '`security.yml` **overlaps** `dependency-audit.yml` and has no concurrency group.',
        'The **DI-compliance comment is stale** — the scan is already blocking.',
        '**Coverage thresholds** are declared in the Vitest config but never enforced (no `--coverage` flag).',
        '**Retries** (`retry: 2` when `CI` is set) can **hide flaky tests**.',
      ]},
      { type: 'callout', text: 'The first two are deliberate design; the last four are known rough edges worth cleaning up. Being able to name the difference is what a reviewer is for.' },
      { type: 'quiz', questions: [
        { q: 'The narrow merge gate means non-required checks that go red…', options: ['block the merge anyway', 'block nothing at all', 'still block the production deploy', 'delete the branch'], answer: 2,
          explain: 'They are advisory for the merge but required by Path B, so red still blocks the release.' },
        { q: 'Which is a genuine rough edge, not a deliberate design choice?', options: ['The narrow merge gate', 'Duplicate work on push to master', 'Coverage thresholds declared but never enforced', 'Queuing deploys'], answer: 2,
          explain: 'Coverage thresholds exist in config but no `--coverage` flag enforces them — a known gap, unlike the intentional narrow gate.' },
      ]},
    ],
  },

  /* ---------------------------------------------------------------- 16 */
  {
    id: 'self-check',
    group: 'Self-Check',
    title: 'Self-check questions',
    blocks: [
      { type: 'p', text: 'Answer these out loud first, then check yourself. If any feel shaky, jump back to the matching topic and drive the tool again.' },
      { type: 'quiz', questions: [
        { q: '1. How many pull-request checks actually block the merge, and which are they?', options: [
          'All ten checks block',
          'Four: env schema, fullstack tests, dependency audit, DI Guardrails',
          'Seven, one per workflow',
          'Zero — approvals are 0'], answer: 1,
          explain: 'The `protect-master` ruleset requires exactly four checks; the rest are report-only for the merge (but block the deploy).' },
        { q: '2. Why is `depends_on`-style `needs` not the whole story for the deploy — what forces every migration to be backward-compatible?', options: [
          'Migrations run after the code is live',
          'Migrations run BEFORE the new code is live, so the old release must still work',
          'Prisma requires it',
          'The pooler forbids changes'], answer: 1,
          explain: 'Migrations apply before the new code goes live (expand/contract), so the running release must tolerate the new schema.' },
        { q: '3. During a `workflow_call`, `${{ github.workflow }}` resolves to…', options: [
          'the reusable workflow\'s own name',
          'the caller\'s workflow name — the cause of the concurrency collision',
          'an empty string',
          'the repository name'], answer: 1,
          explain: 'It becomes the caller\'s name, so standalone and embedded runs shared a group and cancelled each other.' },
        { q: '4. Why is "Full Lint" report-only while "DI Guardrails" blocks?', options: [
          'Full Lint is broken',
          'The lint backlog is large; the DI/Prisma rule prevents a real production failure (pool exhaustion)',
          'DI Guardrails runs faster',
          'They are the same job'], answer: 1,
          explain: 'Blocking on the whole backlog would stop every PR; a leaked `PrismaClient` takes production down, so that narrow rule blocks.' },
        { q: '5. How should the smoke step receive its secrets?', options: [
          'Written to .env and committed',
          'Printed to smoke.log',
          'Through an `env:` block only, never a tracked file',
          'Hard-coded in the workflow'], answer: 2,
          explain: 'Secrets go through `env:` for the run and are never persisted to a tracked or uploaded file.' },
      ]},
      { type: 'callout', kind: 'tip', text: 'Right tool per need: **local pre-commit** for the fastest feedback, **required status checks** for the merge gate, **reusable workflows** for the deploy path, and **event-driven smoke tests** after deployment.' },
    ],
  },
]
