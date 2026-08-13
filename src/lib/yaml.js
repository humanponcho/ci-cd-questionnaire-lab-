/**
 * A small, tolerant YAML-subset parser — enough to walk a GitHub Actions
 * workflow (maps, block sequences including sequences-of-mappings, scalars,
 * inline `[a, b]` lists, and `key: |` / `key: >` block scalars).
 *
 * It is NOT a spec-complete YAML parser. It exists so the Workflow Lab can
 * inspect real workflow files client-side and teach their structure.
 *
 * Node shapes:
 *   scalar -> string
 *   map    -> { map: [ [key, node], ... ] }
 *   seq    -> { seq: [ node, ... ] }
 */
export function parseYaml(text) {
  const toks = tokenize(text)
  let pos = 0

  function parseNode(minIndent) {
    if (pos >= toks.length || toks[pos].indent < minIndent) return ''
    const indent = toks[pos].indent

    // Block sequence: consecutive "- ..." lines at this indent.
    if (isMarker(toks[pos].text)) {
      const items = []
      while (pos < toks.length && toks[pos].indent === indent && isMarker(toks[pos].text)) {
        const rest = toks[pos].text === '-' ? '' : toks[pos].text.slice(2)
        if (rest === '') {
          pos++
          items.push(parseNode(indent + 1))
        } else if (isMapStart(rest)) {
          // Re-anchor the inline content two columns in, then parse a map that
          // absorbs following deeper lines (the sibling keys of this item).
          toks[pos] = { indent: indent + 2, text: rest }
          items.push(parseNode(indent + 2))
        } else {
          items.push(stripQuotes(rest))
          pos++
        }
      }
      return { seq: items }
    }

    // Mapping.
    const entries = []
    while (pos < toks.length && toks[pos].indent === indent && !isMarker(toks[pos].text)) {
      const t = toks[pos].text
      const ci = colonAt(t)
      if (ci < 0) { pos++; continue }
      const key = t.slice(0, ci).trim()
      let rest = t.slice(ci + 1).trim()
      pos++
      let value
      if (rest === '' ) {
        value = (pos < toks.length && toks[pos].indent > indent) ? parseNode(toks[pos].indent) : ''
      } else if (rest === '|' || rest === '>' || rest === '|-' || rest === '>-') {
        // Block scalar: collect deeper lines as one joined string.
        const buf = []
        while (pos < toks.length && toks[pos].indent > indent) { buf.push(toks[pos].text); pos++ }
        value = buf.join('\n')
      } else if (rest.startsWith('[') && rest.endsWith(']')) {
        value = { seq: rest.slice(1, -1).split(',').map((s) => stripQuotes(s.trim())).filter((s) => s !== '') }
      } else {
        value = stripQuotes(rest)
      }
      entries.push([key, value])
    }
    return { map: entries }
  }

  return parseNode(0)
}

/* ---- helpers to read nodes ---- */

export function get(node, key) {
  if (!node || !node.map) return undefined
  const e = node.map.find(([k]) => k === key)
  return e ? e[1] : undefined
}
export function keys(node) {
  return node && node.map ? node.map.map(([k]) => k) : []
}
export function asList(node) {
  if (node == null || node === '') return []
  if (typeof node === 'string') return [node]
  if (node.seq) return node.seq
  if (node.map) return node.map.map(([k]) => k) // a mapping used as a set of keys (e.g. `on:`)
  return []
}
export function isMap(node) { return !!(node && node.map) }

/* ---- lexing ---- */

function tokenize(text) {
  const out = []
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const noTab = raw.replace(/\t/g, '  ')
    if (noTab.trim() === '' || noTab.trim().startsWith('#')) continue
    out.push({ indent: noTab.length - noTab.trimStart().length, text: noTab.trim() })
  }
  return out
}
function isMarker(text) { return text === '-' || text.startsWith('- ') }
function isMapStart(rest) { return /^[A-Za-z_][\w.-]*\s*:(\s|$)/.test(rest) && !rest.startsWith('"') && !rest.startsWith("'") }
// First ':' that is a key separator (followed by space or end), ignoring "${{ }}".
function colonAt(t) {
  for (let i = 0; i < t.length; i++) {
    if (t[i] === ':' && (i + 1 >= t.length || t[i + 1] === ' ')) return i
  }
  return -1
}
function stripQuotes(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1)
  return s
}
