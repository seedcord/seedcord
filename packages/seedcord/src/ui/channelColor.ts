// hash the channel name into a palette that avoids the level + message-accent hues (red = error).
// two channels can share a color, the label and picker carry the exact identity.
const PALETTE = [
    '#ff8a3d',
    '#f5b52a',
    '#b7d43a',
    '#4fbf6a',
    '#2fbfa0',
    '#23b5c9',
    '#3d8ef0',
    '#6d6ff0',
    '#9a6cf0',
    '#c96cf0',
    '#f062c0',
    '#ff5f9e',
    '#7f8cff',
    '#c98a5a'
] as const;

const HASH_PRIME = 31; // odd prime base so the polynomial hash spreads names across the palette

export function channelColor(channel: string): string {
    let h = 0;
    for (const ch of channel) h = (h * HASH_PRIME + ch.charCodeAt(0)) >>> 0;
    return PALETTE[h % PALETTE.length] ?? PALETTE[0];
}
