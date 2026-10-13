import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { addPrs, findPrs, githubBase, groupByRepo, linkHint } from './prs'

const prs = atom({ plugin: 'session-prs', key: 'prs' } as const, [])

export const register: Register = on => {
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined || !/\bgh\s+pr\s+create\b/.test(e.command)) return ran

    const found = findPrs(ran.text ?? '')
    if (found.length > 0) {
      await update($, prs, known => addPrs(known, found))
    }
    return ran
  })

  // The hint line sits right of the mode (`auto mode on · <hint>`). A Text
  // answer stays on that row while a Box starts a row of its own, and a Text
  // cannot hold the engine's drawing, so redraw the hint as text with the PRs
  // as links after it. Reading the atom here redraws the line on a new PR.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const groups = groupByRepo(await read($, prs))
    if (groups.length === 0) return next(e)

    const { Text, Link } = $.ui.resolve(e)
    const repo = await $.session.repo().catch(() => null)
    const base = githubBase(repo?.remote ?? null)
    const link = (href: string, text: string) => <Link href={href}>{text}</Link>
    return (
      <Text dimColor>
        {linkHint(e.props.hint, base).map(s => (s.href === undefined ? s.text : link(s.href, s.text)))}
        {e.props.hint === '' ? 'PRs:' : ' · PRs:'}
        {groups.flatMap((g, i) => [
          i === 0 ? ` ${g.repo}` : ` · ${g.repo}`,
          ...g.prs.flatMap(pr => [' ', link(pr.url, `#${pr.number}`)]),
        ])}
      </Text>
    )
  })
}
