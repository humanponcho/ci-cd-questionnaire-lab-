import { useRef, useState } from 'react'

/**
 * A simulated shell for the CI/CD toolchain (git, gh, vercel, npm, and GitHub
 * Actions run logs). There is no real runner in a browser, so this replays
 * realistic, canned output for a fixed set of commands.
 *
 *  - `session`  : an ordered demo the student can play with "▶ Run".
 *  - `commands` : a map of "command string" -> output lines, for free typing.
 *
 * Output line = a string (dim) OR { t: text, k: 'ok'|'err'|'warn'|'head' }.
 */
export default function Terminal({ name = 'bash', session = [], commands = {}, hint }) {
  const [lines, setLines] = useState([])
  const [input, setInput] = useState('')
  const outRef = useRef(null)
  const idRef = useRef(0)

  function scroll() {
    requestAnimationFrame(() => {
      const el = outRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  function emit(newLines) {
    setLines((prev) => [...prev, ...newLines.map((l) => ({ ...norm(l), id: idRef.current++ }))])
    scroll()
  }

  function runDemo() {
    setLines([])
    idRef.current = 0
    const acc = []
    for (const step of session) {
      acc.push({ ...cmdLine(step.cmd), id: idRef.current++ })
      for (const o of step.out || []) acc.push({ ...norm(o), id: idRef.current++ })
    }
    setLines(acc)
    scroll()
  }

  function submit(e) {
    e.preventDefault()
    const raw = input.trim()
    setInput('')
    if (!raw) return
    if (raw === 'clear') { setLines([]); return }
    emit([cmdLine(raw)])
    const found = commands[raw] || sessionOut(session, raw)
    if (found) emit(found)
    else emit([{ t: `sh: ${firstWord(raw)}: not in this simulator. Try ▶ Run demo, or: ${Object.keys(commands)[0] || (session[0] && session[0].cmd) || 'gh pr checks'}`, k: 'err' }])
  }

  return (
    <div className="pg">
      <div className="pg-bar">
        <div className="pg-dots"><span className="pg-dot r" /><span className="pg-dot y" /><span className="pg-dot g" /></div>
        <span className="pg-name">{name} — simulated</span>
        <div className="pg-actions">
          <button className="btn" onClick={() => setLines([])}>Clear</button>
          {session.length > 0 && <button className="btn run" onClick={runDemo}>▶ Run demo</button>}
        </div>
      </div>
      <div className="term-out" ref={outRef}>
        {lines.length === 0
          ? <span className="log-muted">{session.length ? '# press ▶ Run demo, or type a command below' : '# type a command below'}</span>
          : lines.map((l) => (
              l.k === 'cmd'
                ? <div key={l.id} className="term-line cmd"><span className="prompt">$</span>{l.t}</div>
                : <div key={l.id} className={`term-line out ${l.k || ''}`}>{l.t}</div>
            ))}
      </div>
      <form className="term-inrow" onSubmit={submit}>
        <span className="prompt">$</span>
        <input
          className="term-input"
          spellCheck={false}
          autoComplete="off"
          placeholder="type a command…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </form>
      {hint && <div className="term-hint">{hint}</div>}
    </div>
  )
}

function norm(l) {
  return typeof l === 'string' ? { t: l, k: 'out' } : { t: l.t, k: l.k || 'out' }
}
function cmdLine(cmd) { return { t: cmd, k: 'cmd' } }
function firstWord(s) { return s.split(/\s+/)[0] }
function sessionOut(session, cmd) {
  const step = session.find((s) => s.cmd === cmd)
  return step ? step.out || [] : null
}
