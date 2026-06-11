// Stable, distinct color per channel so a line's channel tag and its toggle entry always match. Red is
// reserved for errors and the live dot, so it is left out of the palette.
const PALETTE = ['cyan', 'green', 'yellow', 'magenta', 'blue', 'cyanBright'] as const;

type ChannelColor = (typeof PALETTE)[number];

const assigned = new Map<string, ChannelColor>();

export function channelColor(channel: string): ChannelColor {
    const existing = assigned.get(channel);
    if (existing) return existing;

    const color = PALETTE[assigned.size % PALETTE.length] ?? PALETTE[0];
    assigned.set(channel, color);
    return color;
}

// the map is module-level, so clear it per dev session or stale channels skew the next session's colors.
export function resetChannelColors(): void {
    assigned.clear();
}
