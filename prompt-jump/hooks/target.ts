export type Shown = { index: number; first: number }

export const targetOf = (
  step: -1 | 1,
  count: number,
  cursor: number | null,
  shown: readonly Shown[],
): number => {
  if (cursor !== null && shown.some(one => one.index === cursor)) {
    return cursor + step
  }
  const top = shown[0]
  const bottom = shown[shown.length - 1]
  if (top && bottom) {
    if (step === -1) {
      return top.first > 0 ? top.index : top.index - 1
    }
    return bottom.index + 1
  }
  if (cursor !== null) {
    return cursor + step
  }
  return step === -1 ? count - 1 : count
}
