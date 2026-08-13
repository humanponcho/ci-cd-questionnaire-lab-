import { useState } from 'react'
import { parseYaml, get, keys, asList, isMap } from '../lib/yaml.js'

/**
 * A live GitHub Actions workflow analyzer. It parses the YAML in your browser
 * (no runner) and teaches structure + the specific traps from the lesson:
 *
 *  - TRIGGERS  — which events start the workflow.
 *  - JOBS      — the needs() graph, reusable-workflow calls, step counts, and
 *                which jobs are "report-only" (continue-on-error → never fail).
 *  - LINT      — the ${{ github.workflow }} concurrency collision, secrets
 *                written into a tracked file, and the job dependency order.
 *
 * Edit the workflow and press ▶ Analyze.
 */
export default function WorkflowLab({ name = 'workflow.yml', initial = '', height = 260 }) {
  const [code, setCode] = useState(initial)
  const [result, setResult] = useState(null)

  function analyze() {
    try { setResult(inspect(code)) }
    catch (e) { setResult({ error: e.message }) }
  }

  return (
    <div className="pg">
      <div className="pg-bar">
        <div className="pg-dots"><span className="pg-dot r" /><span className="pg-dot y" /><span className="pg-dot g" /></div>
        <span className="pg-name">.github/workflows/{name}</span>
        <div className="pg-actions">
          <button className="btn" onClick={() => { setCode(initial); setResult(null) }}>Reset</button>
          <button className="btn run" onClick={analyze}>▶ Analyze</button>
        </div>
      </div>
      <textarea
        className="pg-editor"
        style={{ minHeight: height }}
        spellCheck={false}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={handleTab}
      />
      {result && result.error && (
        <>
          <div className="pg-out-label">Error</div>
          <div className="pg-out"><span className="log-err">✕ {result.error}</span></div>
        </>
      )}
      {result && !result.error && (
        <>
          <div className="pg-out-label">Triggers (on:)</div>
          <div className="pg-out">
            {result.triggers.length
              ? result.triggers.map((t, i) => <span className="wf-trigger" key={i}>{t}</span>)
              : <span className="log-muted">(none found)</span>}
          </div>
          <div className="pg-out-label">Jobs</div>
          <div className="pg-out">
            {result.jobs.length === 0
              ? <span className="log-muted">(no jobs found)</span>
              : result.jobs.map((j, i) => (
                  <div className="job-row" key={i}>
                    <span className="job-name">{j.name}</span>
                    <span className="job-badges">
                      {j.reusable && <span className="jb reusable">reusable call</span>}
                      {j.reportOnly && <span className="jb report">report-only</span>}
                      {j.needs.length > 0 && <span className="jb needs">needs: {j.needs.join(', ')}</span>}
                      {j.steps > 0 && <span className="jb steps">{j.steps} step{j.steps > 1 ? 's' : ''}</span>}
                    </span>
                    {(j.runsOn || j.uses || j.concurrency) && (
                      <div className="job-meta">
                        {j.uses ? `uses ${j.uses}` : `runs-on ${j.runsOn || '—'}`}
                        {j.concurrency ? `  ·  concurrency: ${j.concurrency}` : ''}
                      </div>
                    )}
                  </div>
                ))}
          </div>
          <div className="pg-out-label">Checks</div>
          <div className="pg-out">
            {result.checks.map((c, i) => (
              <div className={`check-row ${c.k}`} key={i}>
                <span className="ico">{ICON[c.k]}</span>
                <span dangerouslySetInnerHTML={{ __html: inline(c.t) }} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const ICON = { ok: '✓', warn: '⚠', err: '✕', note: 'ℹ' }

function inspect(code) {
  const root = parseYaml(code)
  if (!isMap(root)) throw new Error('Top level is not a mapping — is this a workflow file?')

  // Triggers.
  const onNode = get(root, 'on')
  const triggers = asList(onNode)

  // Concurrency (top level).
  const topConc = concurrencyGroup(get(root, 'concurrency'))

  // Jobs.
  const jobsNode = get(root, 'jobs')
  const jobs = []
  const runStrings = []
  if (isMap(jobsNode)) {
    for (const [id, job] of jobsNode.map) {
      const uses = typeof get(job, 'uses') === 'string' ? get(job, 'uses') : null
      const needs = asList(get(job, 'needs'))
      const stepsNode = get(job, 'steps')
      const steps = stepsNode && stepsNode.seq ? stepsNode.seq : []
      let reportOnly = get(job, 'continue-on-error') === 'true'
      for (const st of steps) {
        if (get(st, 'continue-on-error') === 'true') reportOnly = true
        const r = get(st, 'run')
        if (typeof r === 'string') runStrings.push(r)
      }
      jobs.push({
        name: (typeof get(job, 'name') === 'string' && get(job, 'name')) || id,
        needs,
        reusable: !!uses,
        uses,
        runsOn: typeof get(job, 'runs-on') === 'string' ? get(job, 'runs-on') : null,
        reportOnly,
        steps: steps.length,
        concurrency: concurrencyGroup(get(job, 'concurrency')),
      })
    }
  }

  // ---- lint ----
  const checks = []
  const isReusable = triggers.includes('workflow_call')

  // The concurrency collision (lesson topic 11).
  const groupsWithWorkflow = [topConc, ...jobs.map((j) => j.concurrency)]
    .filter((g) => g && /github\.workflow/.test(g))
  if (groupsWithWorkflow.length && isReusable) {
    checks.push({ k: 'warn', t: 'This is a **reusable** workflow (`workflow_call`) whose concurrency group uses `${{ github.workflow }}`. During a `workflow_call` that resolves to the **caller\'s** name — a standalone run and the embedded run share one group and **cancel each other**. Give them distinct group names.' })
  } else if (groupsWithWorkflow.length) {
    checks.push({ k: 'note', t: 'Concurrency group uses `${{ github.workflow }}`. Fine for a standalone workflow — but if this is ever called via `workflow_call`, the name resolves to the caller and groups can collide.' })
  }

  // Secrets written into a file.
  for (const r of runStrings) {
    if (/>>?\s*[^\s]*\.env|>>?\s*[^\s]*\.(ya?ml|json|txt|log)/.test(r) && /secrets\./.test(r)) {
      checks.push({ k: 'warn', t: 'A `run` step writes `secrets.*` into a file. Inject secrets through an `env:` block instead — never persist them to a tracked/uploaded file.' })
      break
    }
  }

  // Report-only jobs.
  const reportJobs = jobs.filter((j) => j.reportOnly)
  if (reportJobs.length) {
    checks.push({ k: 'note', t: `Report-only (continue-on-error): **${reportJobs.map((j) => j.name).join(', ')}**. ${reportJobs.length === 1 ? 'It' : 'They'} can go red without failing the run — so a ruleset must not rely on ${reportJobs.length === 1 ? 'it' : 'them'} as a required check.` })
  }

  // needs graph.
  const withNeeds = jobs.filter((j) => j.needs.length)
  if (withNeeds.length) {
    checks.push({ k: 'note', t: `Job order: ${withNeeds.map((j) => `**${j.name}** waits for ${j.needs.join(', ')}`).join('; ')}.` })
  }

  // Reusable fan-out.
  const reusableCalls = jobs.filter((j) => j.reusable)
  if (reusableCalls.length) {
    checks.push({ k: 'note', t: `Calls ${reusableCalls.length} reusable workflow${reusableCalls.length > 1 ? 's' : ''}: ${reusableCalls.map((j) => `\`${j.uses}\``).join(', ')}.` })
  }

  if (checks.length === 0) checks.push({ k: 'ok', t: 'No structural issues detected.' })
  return { triggers, jobs, checks }
}

function concurrencyGroup(node) {
  if (!node) return null
  if (typeof node === 'string') return node
  const g = get(node, 'group')
  return typeof g === 'string' ? g : null
}

function handleTab(e) {
  if (e.key === 'Tab') {
    e.preventDefault()
    const el = e.target
    const s = el.selectionStart, en = el.selectionEnd
    el.value = el.value.slice(0, s) + '  ' + el.value.slice(en)
    el.selectionStart = el.selectionEnd = s + 2
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

function inline(s) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}
