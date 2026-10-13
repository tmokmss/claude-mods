import { expect, test } from 'claude-code/testing'

import { targetOf } from './target'

test('with nothing on screen, up starts from the latest prompt and walks back', () => {
  expect(targetOf(-1, 3, null, [])).toBe(2)
  expect(targetOf(-1, 3, 2, [])).toBe(1)
  expect(targetOf(1, 3, 1, [])).toBe(2)
  expect(targetOf(1, 3, null, [])).toBe(3)
})

test('after the person scrolled, the prompts on screen decide where to go', () => {
  expect(targetOf(-1, 5, 4, [{ index: 2, first: 0 }])).toBe(1)
  expect(targetOf(-1, 5, 4, [{ index: 2, first: 3 }])).toBe(2)
  expect(targetOf(1, 5, 0, [{ index: 1, first: 0 }, { index: 2, first: 0 }])).toBe(3)
})

test('the cursor wins while its prompt is still on screen', () => {
  expect(targetOf(-1, 5, 2, [{ index: 2, first: 0 }, { index: 3, first: 0 }])).toBe(1)
})

test('the band binds ctrl+up and ctrl+down to its two buttons', async ($, on) => {
  const ui = await $.ui.mount({
    plugin: 'prompt-jump',
    surface: 'terminal',
    component: 'AbovePrompt',
    requestId: 'band',
    props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { offset: 0, bodyRows: 1 }, view: {} },
  })

  expect(await ui.find({ key: 'up' })).toMatchObject({ props: { action: 'app:diffFileListUp' } })
  expect(await ui.find({ key: 'down' })).toMatchObject({ props: { action: 'app:diffFileListDown' } })
})
