import { expect, test } from 'claude-code/testing'

import { githubBase, groupByRepo, linkHint } from './prs'

const bash = (stdout: string) => ({
  result: { stdout, stderr: '', interrupted: false },
  text: stdout,
})

const engineLine = { type: 'Text' as const, props: {}, children: ['← for agents · PR #12'] }

test('groups PRs by repo in first-seen order', () => {
  const pr = (repo: string, number: number) => ({ repo, number, url: `${repo}/${number}` })
  expect(groupByRepo([pr('a', 12), pr('b', 3), pr('a', 15)])).toEqual([
    { repo: 'a', prs: [pr('a', 12), pr('a', 15)] },
    { repo: 'b', prs: [pr('b', 3)] },
  ])
})

test('reads the GitHub repo from ssh and https remotes', () => {
  expect(githubBase('git@github.com:acme/web.git')).toBe(
    'https://github.com/acme/web',
  )
  expect(githubBase('https://github.com/acme/other')).toBe('https://github.com/acme/other')
  expect(githubBase('https://gitlab.com/acme/other.git')).toBe(undefined)
  expect(githubBase(null)).toBe(undefined)
})

test('links the PR pill of the hint', () => {
  expect(linkHint('← for agents · PR #87 · 1 shell', 'https://github.com/o/r')).toEqual([
    { text: '← for agents · ' },
    { text: 'PR #87', href: 'https://github.com/o/r/pull/87' },
    { text: ' · 1 shell' },
  ])
  expect(linkHint('PR #87', undefined)).toEqual([{ text: 'PR #87' }])
  expect(linkHint('', 'https://github.com/o/r')).toEqual([])
})

test('appends every PR gh pr create printed to the hint line as links', async ($, on) => {
  on('ui.render', { component: 'PromptHint' }, () => engineLine)
  on('session.repo', () => ({
    value: { root: '/r', remote: 'git@github.com:acme/app.git', internal: false, name: null },
  }))
  const outputs = [
    'https://github.com/acme/web/pull/12\n',
    'https://github.com/acme/web/pull/15\n',
    'https://github.com/acme/web/pull/12\n',
    'https://github.com/acme/other/pull/3\n',
    'https://github.com/acme/other/pull/99\n',
  ]
  let i = 0
  on('tool.call', { tool: 'Bash' }, () => bash(outputs[i++] ?? ''))

  const render = (hint: string) =>
    $.ui.render({
      surface: 'terminal',
      component: 'PromptHint',
      requestId: 'hint',
      props: { isDraft: false, isWorking: false, hint },
    })

  // Nothing created yet: the engine's line as is
  expect(await render('← for agents · PR #12')).toEqual(engineLine)

  await $.tool.call({ tool: 'Bash', command: 'gh pr create --draft --fill' })
  await $.tool.call({ tool: 'Bash', command: 'gh pr create --fill' })
  await $.tool.call({ tool: 'Bash', command: 'gh pr create --fill' })
  await $.tool.call({ tool: 'Bash', command: 'cd ../other && gh pr create --fill' })
  // Viewing someone's PR is not creating one
  await $.tool.call({ tool: 'Bash', command: 'gh pr view 99 --json url' })

  // A Text, so the line stays on the mode's row
  const tree = await render('← for agents · PR #87 · 1 shell')
  expect(tree.type).toBe('Text')
  const json = JSON.stringify(tree)
  expect(json).toContain('← for agents · ')
  expect(json).toContain('"href":"https://github.com/acme/app/pull/87"')
  expect(json).toContain(' · 1 shell')
  expect(json).toContain(' · PRs:')
  expect(json).toContain('"href":"https://github.com/acme/web/pull/12"')
  expect(json).toContain('"href":"https://github.com/acme/web/pull/15"')
  expect(json).toContain('"href":"https://github.com/acme/other/pull/3"')
  expect(json).toContain('" · other"')
  expect(json).not.toContain('/pull/99')

  // An empty hint: no leading separator
  expect(JSON.stringify(await render(''))).not.toContain('· PRs:')
})
