import { type ColorResolvable, Colors } from 'discord.js';

/**
 * Converts a color to ColorResolvable if possible.
 *
 * @internal
 */
export function parseEnvColor(raw: string | undefined | null, fallback: ColorResolvable): ColorResolvable {
    if (!raw) return fallback;

    // eslint-disable-next-line no-magic-numbers
    const toHex = (n: number): ColorResolvable => `#${n.toString(16).padStart(6, '0')}` as ColorResolvable;

    // try numeric parse first
    const num = Number(raw);
    if (!Number.isNaN(num) && num >= 0) return toHex(num);

    // hex with #
    if (raw.startsWith('#')) return raw as ColorResolvable;

    // hex without #
    if (/^[0-9A-Fa-f]{6}$/.test(raw)) return `#${raw}` as ColorResolvable;

    // Discord named colors
    const colorKey = Object.keys(Colors).find((key) => key.toLowerCase() === raw.toLowerCase()) as
        | keyof typeof Colors
        | undefined;

    if (colorKey) return toHex(Colors[colorKey]);

    return fallback;
}
