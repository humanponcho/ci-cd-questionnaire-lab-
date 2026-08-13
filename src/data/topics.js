import { section1 } from './topics-1.js'
import { section2 } from './topics-2.js'
import { section3 } from './topics-3.js'

// Flat ordered list of every topic (mirrors the lesson order).
export const topics = [...section1, ...section2, ...section3]

// Grouped for the sidebar rail, preserving order.
export const groups = topics.reduce((acc, t, i) => {
  const g = acc.find((x) => x.name === t.group)
  const entry = { ...t, index: i }
  if (g) g.items.push(entry)
  else acc.push({ name: t.group, items: [entry] })
  return acc
}, [])
