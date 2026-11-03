import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';

import { useSectionCursor } from '#components/useSectionCursor.ts';

const HEADINGS = ['setup', 'options', 'replies'] as const;

const scrolled: string[] = [];

// jsdom lays nothing out, so each heading reports the top the test gives it
function placeHeading(id: string, top: number): void {
    const heading = document.getElementById(id);
    if (heading === null) throw new Error(`no heading ${id}`);
    heading.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: top, width: 100, height: 30 });
}

beforeEach(() => {
    document.body.innerHTML = HEADINGS.map((id) => `<h2 id="${id}">${id}</h2>`).join('');
    HEADINGS.forEach((id, index) => placeHeading(id, index * 400));
    scrolled.length = 0;
    // jsdom omits scrollIntoView. a real scroll moves the heading to the top of the screen
    Element.prototype.scrollIntoView = function (this: Element) {
        scrolled.push(this.id);
        placeHeading(this.id, 0);
    };
});

// the worker runs other files after this one
afterEach(() => {
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    document.body.innerHTML = '';
});

describe('useSectionCursor', () => {
    it('steps one heading per press, even before the heading in view catches up', () => {
        const { result } = renderHook(() => useSectionCursor(HEADINGS, 'setup'));

        act(() => result.current.step(1));
        act(() => result.current.step(1));
        act(() => result.current.step(1));
        act(() => result.current.step(-1));

        expect(scrolled).toEqual(['options', 'replies', 'options']);
        expect(result.current.section()).toBe('options');
    });

    it('starts from the heading in view once the cursor scrolled off screen', () => {
        const { result, rerender } = renderHook(({ inView }) => useSectionCursor(HEADINGS, inView), {
            initialProps: { inView: 'setup' }
        });
        act(() => result.current.step(1));

        placeHeading('options', -2000);
        rerender({ inView: 'replies' });
        act(() => result.current.step(-1));

        expect(scrolled).toEqual(['options', 'options']);
        expect(result.current.section()).toBe('options');
    });
});
