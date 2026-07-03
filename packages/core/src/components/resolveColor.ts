import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordRangeError, SeedcordTypeError } from '@seedcord/errors/internal';

import { Colors } from './colors';

import type { BotColor } from './colors';

const MAX_COLOR = 0xff_ff_ff;
const RED_SHIFT = 16;
const GREEN_SHIFT = 8;

const palette: Record<string, number | undefined> = Colors;

/**
 * Resolves a {@link BotColor} to the integer Discord expects.
 *
 * Ported from discord.js (Apache-2.0), `resolveColor` in src/util/Util.js.
 */
export function resolveColor(color: BotColor): number {
    let resolved: number | undefined;

    if (typeof color === 'string') {
        if (color === 'Random') return Math.floor(Math.random() * (MAX_COLOR + 1));
        if (color === 'Default') return 0;
        if (/^#?[\da-f]{6}$/i.test(color)) return Number.parseInt(color.replace('#', ''), 16);
        resolved = palette[color];
    } else if (typeof color === 'number') {
        resolved = color;
    } else {
        resolved = (color[0] << RED_SHIFT) + (color[1] << GREEN_SHIFT) + color[2];
    }

    if (resolved === undefined || !Number.isSafeInteger(resolved)) {
        throw new SeedcordTypeError(SeedcordErrorCode.ColorUnresolvable, [JSON.stringify(color)]);
    }
    if (resolved < 0 || resolved > MAX_COLOR) {
        throw new SeedcordRangeError(SeedcordErrorCode.ColorOutOfRange);
    }

    return resolved;
}
