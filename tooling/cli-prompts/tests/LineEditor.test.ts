import { describe, expect, it } from 'vitest';

import { LineEditor } from '#src/LineEditor';

const caretAtEnd = (text: string): LineEditor => LineEditor.empty().insert(text);

describe('LineEditor', () => {
    it('stops at either end of the line', () => {
        const atStart = caretAtEnd('main hub').start();
        const atEnd = caretAtEnd('main hub');

        expect(atStart.left().deleteBack().deleteWordBack()).toEqual(atStart);
        expect(atEnd.right().deleteForward().deleteWordForward()).toEqual(atEnd);
    });

    it.each([
        ['an emoji', 'a😀'],
        ['a family emoji', 'a👨‍👩‍👧'],
        ['a flag', 'a🇯🇵']
    ])('deletes %s whole', (_name, text) => {
        expect(caretAtEnd(text).deleteBack().text).toBe('a');
    });

    it('moves over an emoji whole', () => {
        expect(caretAtEnd('a👨‍👩‍👧b').left().left().insert('x').text).toBe('ax👨‍👩‍👧b');
    });

    it('masks each character and keeps the caret between the same ones', () => {
        const masked = caretAtEnd('a👨‍👩‍👧b').left().masked('•');

        expect([masked.before, masked.after]).toEqual(['••', '•']);
    });
});
