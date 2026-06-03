// Stable, distinct color per channel so a line's channel tag and its toggle entry always match. Red is
// reserved for errors and the live dot, so it is left out of the palette.
const PALETTE = ['cyan', 'green', 'yellow', 'magenta', 'blue', 'cyanBright'] as const;

type ChannelColor = (typeof PALETTE)[number];

export function channelColor(channel: string): ChannelColor {
    // Cheap order-insensitive sum; collisions are purely cosmetic across the handful of dev channels.
    let hash = 0;
    for (const char of channel) hash = (hash + char.charCodeAt(0)) % PALETTE.length;
    return PALETTE[hash] ?? PALETTE[0];
}
