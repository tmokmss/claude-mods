export type Pr = { repo: string; number: number; url: string }

declare module 'claude-code' {
  interface PluginState {
    'session-prs': { prs: readonly Pr[] }
  }
}
