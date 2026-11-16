import type { BotColor } from '@seedcord/types';

// must be 'Default' so the container guard in applyBotColor doesn't set the accent
const DEFAULT_COLOR: BotColor = 'Default';

let readBotColor: () => BotColor | undefined = () => undefined;

export function bindBotColor(read: () => BotColor | undefined): void {
    readBotColor = read;
}

export function getBotColor(): BotColor {
    return readBotColor() ?? DEFAULT_COLOR;
}
