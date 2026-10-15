import { paint } from '@seedcord/errors';

import type { LineEditor } from './LineEditor';

export const PROMPT_MARKS = {
    question: '?',
    cursor: '❯',
    picked: '■',
    unpicked: '□'
} as const;

const ROW_INDENT = '  ';
// a row without the cursor lines its text up with the highlighted one
const PAST_CURSOR = ' '.repeat(PROMPT_MARKS.cursor.length + 1);

export function question(message: string): string {
    return `${paint.sky(PROMPT_MARKS.question)} ${message}`;
}

export function cursorRow(text: string, highlighted: boolean): string {
    return highlighted
        ? `${ROW_INDENT}${paint.sky(PROMPT_MARKS.cursor)} ${paint.sky.bold(text)}`
        : `${ROW_INDENT}${PAST_CURSOR}${text}`;
}

export function checkbox(picked: boolean): string {
    return picked ? paint.mint(PROMPT_MARKS.picked) : paint.mute(PROMPT_MARKS.unpicked);
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
