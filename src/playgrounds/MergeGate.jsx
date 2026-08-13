import { useState } from 'react'

/**
 * An interactive merge-gate simulator. The `protect-main` ruleset requires only
 * a specific subset of the pull-request checks; the rest can go red without
 * blocking the merge. Click any check to flip it pass/fail and watch the verdict.
 *
 * checks: [{ name, workflow, required: boolean, status: 'pass' | 'fail' }]
 * The verdict is BLOCKED iff any REQUIRED check is failing. Failing optional
 * checks are shown, but they never block.
 */
export default function MergeGate({ checks = [], note }) {
  const [state, setState] = useState(() => checks.map((c) => c.status || 'pass'))

  function toggle(i) {
    setState((prev) => prev.map((s, j) => (j === i ? (s === 'pass' ? 'fail' : 'pass') : s)))
  }

  const failingRequired = checks.filter((c, i) => c.required && state[i] === 'fail')
  const failingOptional = checks.filter((c, i) => !c.required && state[i] === 'fail')
  const mergeable = failingRequired.length === 0

  return (
    <div className="pg" style={{ padding: '16px' }}>
      <div className={`gate-verdict ${mergeable ? 'pass' : 'block'}`}>
        {mergeable ? '✓ MERGEABLE' : '✕ MERGE BLOCKED'}
      </div>
      <div className="gate-sub">
        {mergeable
          ? (failingOptional.length
              ? `${failingOptional.length} check${failingOptional.length > 1 ? 's are' : ' is'} red, but ${failingOptional.length > 1 ? 'none are' : "it is not"} required — the merge is allowed.`
              : 'All checks pass.')
          : `Waiting on required check${failingRequired.length > 1 ? 's' : ''}: ${failingRequired.map((c) => c.name).join(', ')}.`}
      </div>

      {checks.map((c, i) => (
        <button key={i} className="gate-check" onClick={() => toggle(i)}>
          <span className={`gate-status ${state[i]}`}>{state[i] === 'pass' ? '● pass' : '● fail'}</span>
          <span>
            {c.name}
            <span className="wf">  {c.workflow}</span>
          </span>
          <span className={`gate-req ${c.required ? 'required' : 'optional'}`}>
            {c.required ? 'required' : 'optional'}
          </span>
        </button>
      ))}

      <div className="gate-hint">Click a check to flip it pass ⇄ fail. Only the four <span style={{ color: 'var(--accent)' }}>required</span> checks block the merge.</div>
      {note && <div className="gate-hint" style={{ marginTop: 8 }} dangerouslySetInnerHTML={{ __html: inline(note) }} />}
    </div>
  )
}

function inline(s) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}
