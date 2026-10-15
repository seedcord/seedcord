import { describe, expect, it } from 'vitest';

import { LineEditor } from '#core/prompts/LineEditor';

// "main hub " with the caret at the end
const typed = (): LineEditor => LineEditor.empty().insert('main hub ');
// the same text with the caret before "hub"
const middle = (): LineEditor => typed().wordLeft();

describe('LineEditor', () => {
    it('deletes the word before the caret, with the spaces after it', () => {
        expect(typed().deleteWordBack().text).toBe('main ');
    });

    it('moves the caret to the start of the word before it', () => {
        expect(typed().wordLeft().insert('x').text).toBe('main xhub ');
    });

    it.each([
        ['deleteBack', (line: LineEditor) => line.deleteBack(), 'mainhub '],
        ['deleteForward', (line: LineEditor) => line.deleteForward(), 'main ub '],
        ['deleteWordForward', (line: LineEditor) => line.deleteWordForward(), 'main  '],
        ['deleteToStart', (line: LineEditor) => line.deleteToStart(), 'hub '],
        ['deleteToEnd', (line: LineEditor) => line.deleteToEnd(), 'main ']
    ])('%s cuts around the caret', (_name, edit, expected) => {
        expect(edit(middle()).text).toBe(expected);
    });

    it.each([
        ['left', (line: LineEditor) => line.left(), 'mainx hub '],
        ['right', (line: LineEditor) => line.right(), 'main hxub '],
        ['wordRight', (line: LineEditor) => line.wordRight(), 'main hubx '],
        ['start', (line: LineEditor) => line.start(), 'xmain hub '],
        ['end', (line: LineEditor) => line.end(), 'main hub x']
    ])('%s moves the caret', (_name, move, expected) => {
        expect(move(middle()).insert('x').text).toBe(expected);
    });

    it('stops at either end of the line', () => {
        const atStart = typed().start();
        const atEnd = typed();

        expect(atStart.left().deleteBack().deleteWordBack()).toEqual(atStart);
        expect(atEnd.right().deleteForward().deleteWordForward()).toEqual(atEnd);
    });
});
