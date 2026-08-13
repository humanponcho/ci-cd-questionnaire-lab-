/**
 * Read-only code panel for showing workflow YAML, config files, and shell
 * snippets that are illustrative (not meant to be analyzed). Comments and a few
 * YAML keywords are lightly highlighted. Use the interactive playgrounds
 * (Terminal / WorkflowLab / MergeGate) when the point is to *run* something.
 */
const YAML_KEYS = new Set([
  'name', 'on', 'jobs', 'steps', 'runs-on', 'needs', 'uses', 'with', 'run',
  'env', 'if', 'permissions', 'concurrency', 'strategy', 'services', 'secrets',
  'push', 'pull_request', 'workflow_call', 'workflow_dispatch', 'schedule',
  'deployment_status', 'continue-on-error', 'cancel-in-progress', 'group',
])

export default function CodeBlock({ name = 'snippet', lang = '', code = '' }) {
  const html = highlight(code, lang)
  return (
    <div className="code-static">
      <div className="pg-bar">
        <div className="pg-dots"><span className="pg-dot r" /><span className="pg-dot y" /><span className="pg-dot g" /></div>
        <span className="pg-name">{name}</span>
        {lang && <span className="pg-name" style={{ marginLeft: 'auto', textTransform: 'uppercase', fontSize: 10, letterSpacing: '.08em' }}>{lang}</span>}
      </div>
      <pre dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlight(code, lang) {
  return code.split('\n').map((line) => {
    const trimmed = line.trimStart()
    // Whole-line comments (# ...).
    if (trimmed.startsWith('#')) return `<span class="cmt">${esc(line)}</span>`
    const safe = esc(line)
    if (lang === 'yaml' || lang === 'yml') {
      // Highlight a leading "key:" token.
      const m = safe.match(/^(\s*(?:- )?)([A-Za-z_][\w.-]*)(:)/)
      if (m && YAML_KEYS.has(m[2])) {
        return safe.replace(`${m[2]}:`, `<span class="kw">${m[2]}</span>:`)
      }
    }
    return safe
  }).join('\n')
}
