import type { BotColor } from './colors';

// must be 'Default' so the container guard in applyBotColor leaves the accent unset
const DEFAULT_COLOR: BotColor = 'Default';

let current: BotColor = DEFAULT_COLOR;

/** @internal */
export function setBotColor(color: BotColor | undefined): void {
    current = color ?? DEFAULT_COLOR;
}

/** @internal */
export function getBotColor(): BotColor {
    return current;
}
