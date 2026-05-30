import type { ColorResolvable } from 'discord.js';

// 'Default' is Discord.js's own sentinel for "no explicit color".
const DEFAULT_COLOR: ColorResolvable = 'Default';

let current: ColorResolvable = DEFAULT_COLOR;

/** @internal */
export function setBotColor(color: ColorResolvable | undefined): void {
    current = color ?? DEFAULT_COLOR;
}

/** @internal */
export function getBotColor(): ColorResolvable {
    return current;
}
