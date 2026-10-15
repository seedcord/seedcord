import { paint } from '@seedcord/errors';

import type { LineEditor } from './LineEditor';

export function question(message: string): string {
    return `${paint.sky('?')} ${message}`;
}

export function cursorRow(text: string, highlighted: boolean): string {
    return highlighted ? `  ${paint.sky('❯')} ${paint.sky.bold(text)}` : `    ${text}`;
}

// the caret draws over the character it sits before, or over a space at the end of the line
export function lineField(line: LineEditor, placeholder: string): string {
    const under = line.after.charAt(0) || ' ';
    const tail = line.text === '' ? paint.mute(placeholder) : paint.sky(line.after.slice(1));
    return `${paint.sky(line.before)}${paint.sky.inverse(under)}${tail}`;
}

export function keyHints(hints: Readonly<Record<string, string>>): string {
    return Object.entries(hints)
        .map(([key, action]) => `${paint.sky(key)} ${paint.mute(action)}`)
        .join('  ');
}
