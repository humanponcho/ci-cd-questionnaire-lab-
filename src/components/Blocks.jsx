import Terminal from '../playgrounds/Terminal.jsx'
import WorkflowLab from '../playgrounds/WorkflowLab.jsx'
import MergeGate from '../playgrounds/MergeGate.jsx'
import CodeBlock from './CodeBlock.jsx'
import Table from './Table.jsx'
import Quiz from './Quiz.jsx'

/**
 * Renders an array of content blocks. Each topic is authored as data (see
 * src/data/topics-*.js) and this component maps block types to UI. Keeping
 * content as data means the whole syllabus is editable in one place.
 */
export default function Blocks({ blocks }) {
  return (
    <>
      {blocks.map((b, i) => <Block key={i} b={b} />)}
    </>
  )
}

function Block({ b }) {
  switch (b.type) {
    case 'h2':
      return <h2 className="block-title">{b.text}{b.tag && <span className="tag">{b.tag}</span>}</h2>
    case 'p':
      return <div className="prose"><p dangerouslySetInnerHTML={{ __html: md(b.text) }} /></div>
    case 'ul':
      return (
        <div className="prose">
          <ul>{b.items.map((it, i) => <li key={i} dangerouslySetInnerHTML={{ __html: md(it) }} />)}</ul>
        </div>
      )
    case 'callout':
      return (
        <div className={`callout ${b.kind || ''}`}>
          <div className="callout-label">{b.label || (b.kind === 'warn' ? 'Watch out' : b.kind === 'tip' ? 'Tip' : 'Note')}</div>
          <div dangerouslySetInnerHTML={{ __html: md(b.text) }} />
        </div>
      )
    case 'table':
      return <Table head={b.head} rows={b.rows} />
    case 'code':
      return <CodeBlock name={b.name} lang={b.lang} code={b.code} />
    case 'terminal':
      return <Terminal name={b.name} session={b.session} commands={b.commands} hint={b.hint} />
    case 'workflow':
      return <WorkflowLab name={b.name} initial={b.code} height={b.height} />
    case 'gate':
      return <MergeGate checks={b.checks} note={b.note} />
    case 'quiz':
      return <Quiz questions={b.questions} />
    default:
      return null
  }
}

/* Tiny inline markdown: `code`, **bold**. Enough for our authored content. */
export function md(s) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}
