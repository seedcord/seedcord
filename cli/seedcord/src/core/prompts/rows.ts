import { paint } from '@seedcord/errors';

export function question(message: string): string {
    return `${paint.sky('?')} ${message}`;
}

export function cursorRow(text: string, highlighted: boolean): string {
    return highlighted ? `  ${paint.sky('❯')} ${paint.sky.bold(text)}` : `    ${text}`;
}

export function keyHints(hints: Readonly<Record<string, string>>): string {
    return Object.entries(hints)
        .map(([key, action]) => `${paint.sky(key)} ${paint.mute(action)}`)
        .join('  ');
}
