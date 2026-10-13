import type { EngineInterface, Register } from 'claude-code'

import { targetOf } from './target'

const PROMPT_IDS =
  'sed -nE \'/"origin":\\{"kind":"(human|bridge)"\\}|"role":"user","content":"<command-name>/s/.*"uuid":"([^"]*)".*/\\1/p\' "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/projects/*/"$1".jsonl'

const FLASH = "printf '\\033]11;#3a404c\\007' > /dev/tty; sleep 0.15; printf '\\033]111\\007' > /dev/tty"

async function promptIds($: EngineInterface, gone: ReadonlySet<string>) {
  const { stdout } = await $.process.run(['sh', '-c', PROMPT_IDS, 'sh', await $.session.id()])
  return stdout.split('\n').filter(id => id !== '' && !gone.has(id))
}

export const register: Register = on => {
  const onScreen = new Map<string, { first: number } | null>()
  const gone = new Set<string>()
  let cursor: string | null = null

  on('ui.render', { component: 'UserMessage' }, ($, e, next) => {
    if (e.surface === 'terminal' && e.props.onScreen !== undefined) {
      onScreen.set(e.requestId, e.props.onScreen)
    }

    return next(e)
  })

  on('prompt.submit', ($, e, next) => {
    cursor = null

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, ($, e, next) => {
    if (e.props.hasSurvey || e.surface !== 'terminal') {
      return next(e)
    }

    const { Box, Button } = $.ui.resolve(e)

    const jump = async (step: -1 | 1) => {
      for (;;) {
        const prompts = await promptIds($, gone)
        const shown = prompts.flatMap((id, index) => {
          const at = onScreen.get(id)
          return at ? [{ index, first: at.first }] : []
        })
        const at = cursor === null ? -1 : prompts.indexOf(cursor)
        const target = targetOf(step, prompts.length, at < 0 ? null : at, shown)
        const id = prompts[target]
        if (id === undefined) {
          await $.process.run(['sh', '-c', FLASH])
          return
        }
        const moved = await $.ui.scroll({ to: { requestId: id }, block: 'start' })
        if (moved.deny === 'nothing drawn under that requestId') {
          gone.add(id)
          continue
        }
        if (moved.deny) {
          $.ui.toast(`ジャンプできませんでした: ${moved.deny}`)
          return
        }
        cursor = id
        return
      }
    }

    return (
      <Box display="none">
        <Button key="up" label="up" action="app:diffFileListUp" onPress={() => jump(-1)} />
        <Button key="down" label="down" action="app:diffFileListDown" onPress={() => jump(1)} />
      </Box>
    )
  })
}
