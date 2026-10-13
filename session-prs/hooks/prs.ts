import type { Pr } from '../types'

const PR_URL = /https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)/g

export const findPrs = (text: string): Pr[] =>
  [...text.matchAll(PR_URL)].map(m => ({
    repo: m[2]!,
    number: Number(m[3]),
    url: m[0],
  }))

export const addPrs = (known: readonly Pr[], found: readonly Pr[]): Pr[] => {
  const all = [...known]
  for (const pr of found) {
    if (!all.some(p => p.url === pr.url)) all.push(pr)
  }
  return all
}

// Repos in first-seen order, each with its PRs in creation order
export const groupByRepo = (prs: readonly Pr[]): { repo: string; prs: Pr[] }[] => {
  const byRepo = new Map<string, Pr[]>()
  for (const pr of prs) {
    byRepo.set(pr.repo, [...(byRepo.get(pr.repo) ?? []), pr])
  }
  return [...byRepo].map(([repo, prs]) => ({ repo, prs }))
}

// `https://github.com/owner/repo` from an `origin` remote, ssh or https
export const githubBase = (remote: string | null): string | undefined => {
  const m = remote?.match(/github\.com[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/)
  return m ? `https://github.com/${m[1]}/${m[2]}` : undefined
}

export type Segment = { text: string; href?: string }

// The engine's hint as text, its `PR #87` pill linked to the session repo's PR
export const linkHint = (hint: string, base: string | undefined): Segment[] =>
  hint
    .split(/(PR #\d+)/)
    .filter(text => text !== '')
    .map(text => {
      const n = base === undefined ? undefined : text.match(/^PR #(\d+)$/)?.[1]
      return n === undefined ? { text } : { text, href: `${base}/pull/${n}` }
    })
