// stable first-seen assignment keeps a channel's tag and its filter chip matched. red is reserved for errors and the live dot, so it is left out.
const PALETTE = [
    '#ff8a3d',
    '#ff6a4d',
    '#f5b52a',
    '#d9d641',
    '#a3d93a',
    '#5fc95a',
    '#35c98a',
    '#2fbfa0',
    '#23b5c9',
    '#3d9ff0',
    '#3d8ef0',
    '#5a7bff',
    '#6d6ff0',
    '#9a6cf0',
    '#b85cf0',
    '#c96cf0',
    '#e05cd0',
    '#f062c0',
    '#ff5f9e',
    '#ff6b6b'
] as const;

const assigned = new Map<string, string>();

export function channelColor(channel: string): string {
    const existing = assigned.get(channel);
    if (existing !== undefined) return existing;

    const color = PALETTE[assigned.size % PALETTE.length] ?? PALETTE[0];
    assigned.set(channel, color);
    return color;
}

// the map is module-level, so clear it per dev session or stale channels skew the next session's colors.
export function resetChannelColors(): void {
    assigned.clear();
}
