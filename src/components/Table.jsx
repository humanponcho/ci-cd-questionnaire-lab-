import { md } from './Blocks.jsx'

/**
 * A simple data table. Cells support the same inline `code` / **bold** markdown
 * as the prose blocks. The literal tokens "Yes" and "No" are colored so the
 * "blocks merge?" columns read at a glance.
 */
export default function Table({ head = [], rows = [] }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        {head.length > 0 && (
          <thead>
            <tr>{head.map((h, i) => <th key={i} dangerouslySetInnerHTML={{ __html: md(h) }} />)}</tr>
          </thead>
        )}
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => <td key={j} dangerouslySetInnerHTML={{ __html: cell(c) }} />)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function cell(c) {
  const html = md(String(c))
  return html
    .replace(/^Yes\b/, '<span class="yes">Yes</span>')
    .replace(/^No\b/, '<span class="no">No</span>')
}
