import { paint } from '@seedcord/errors';

import type { LineEditor } from './LineEditor';

export const PROMPT_MARKS = {
    question: '?',
    cursor: '❯',
    picked: '■',
    unpicked: '□'
} as const;

const ROW_INDENT = '  ';
const CURSOR_GUTTER = ' '.repeat(PROMPT_MARKS.cursor.length + 1);

export function question(message: string): string {
    return `${paint.sky(PROMPT_MARKS.question)} ${message}`;
}

export function cursorRow(text: string, highlighted: boolean): string {
    return highlighted
        ? `${ROW_INDENT}${paint.sky(PROMPT_MARKS.cursor)} ${paint.sky.bold(text)}`
        : `${ROW_INDENT}${CURSOR_GUTTER}${text}`;
}

export function hinted(row: string, hint: string | undefined): string {
    return hint ? `${row}  ${paint.mute(hint)}` : row;
}

export function checkbox(picked: boolean): string {
    return picked ? paint.mint(PROMPT_MARKS.picked) : paint.mute(PROMPT_MARKS.unpicked);
}

// the caret inverts the character after it, or a space at the end of the line
export function lineField(line: LineEditor, placeholder: string): string {
    const under = line.atCaret || ' ';
    const tail = line.text === '' ? paint.mute(placeholder) : paint.sky(line.after.slice(line.atCaret.length));
    return `${paint.sky(line.before)}${paint.sky.inverse(under)}${tail}`;
}

export function keyHints(hints: Readonly<Record<string, string>>): string {
    return Object.entries(hints)
        .map(([key, action]) => `${paint.sky(key)} ${paint.mute(action)}`)
        .join('  ');
}
