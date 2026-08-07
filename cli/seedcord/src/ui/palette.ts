// truecolor palette for the dev-TUI's own chrome (headings, hotkeys, status), so it renders the same
// across terminals. the bot's log lines carry their own colors
export const ui = {
    accent: '#7dcfff',
    muted: '#9aa0b3',
    faint: '#565c6b',
    good: '#9ece6a',
    warn: '#e0af68',
    bad: '#f7768e'
} as const;
