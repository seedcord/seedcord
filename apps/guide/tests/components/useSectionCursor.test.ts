import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { useSectionCursor } from '#components/useSectionCursor';

const HEADINGS = ['setup', 'options', 'replies'] as const;

const scrolled: string[] = [];

// jsdom lays nothing out, so each heading reports the top that the test gives it
function placeHeading(id: string, top: number): void {
    const heading = document.getElementById(id);
    if (heading === null) throw new Error(`no heading ${id}`);
    heading.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: top, width: 100, height: 30 });
}

beforeEach(() => {
    document.body.innerHTML = HEADINGS.map((id) => `<h2 id="${id}">${id}</h2>`).join('');
    HEADINGS.forEach((id, index) => placeHeading(id, index * 400));
    scrolled.length = 0;
    vi.stubGlobal('scrollY', 300);
    vi.stubGlobal('scrollTo', ({ top }: { top: number }) => {
        scrolled.push(top === 0 ? 'page top' : 'page bottom');
        vi.stubGlobal('scrollY', top);
    });
    // jsdom omits scrollIntoView. a real scroll moves the heading to the top of the screen
    Element.prototype.scrollIntoView = function (this: Element) {
        scrolled.push(this.id);
        placeHeading(this.id, 0);
    };
});

// the worker runs other files after this one
afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(document.documentElement, 'scrollHeight');
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

    it('steps from the first section to the top of the page and back', () => {
        const { result } = renderHook(() => useSectionCursor(HEADINGS, 'setup'));

        act(() => result.current.step(-1));
        act(() => result.current.step(-1));
        expect(result.current.section()).toBe('');

        act(() => result.current.step(1));

        expect(scrolled).toEqual(['page top', 'setup']);
    });

    it('jumps to the bottom on the last heading and to the top from anywhere', () => {
        Object.defineProperty(document.documentElement, 'scrollHeight', { value: 5000, configurable: true });
        const { result } = renderHook(() => useSectionCursor(HEADINGS, 'setup'));

        act(() => result.current.toBottom());
        placeHeading('replies', 100);
        expect(result.current.section()).toBe('replies');

        act(() => result.current.step(-1));
        act(() => result.current.toTop());

        expect(scrolled).toEqual(['page bottom', 'options', 'page top']);
        expect(result.current.section()).toBe('');
    });

    it('reads a page opened at the top as the page title, over the heading in view', () => {
        vi.stubGlobal('scrollY', 0);
        const { result } = renderHook(() => useSectionCursor(HEADINGS, 'setup'));

        expect(result.current.section()).toBe('');

        act(() => result.current.step(1));

        expect(scrolled).toEqual(['setup']);
        expect(result.current.section()).toBe('setup');
    });

    it('starts from the heading in view once you scroll away from the top', () => {
        const { result } = renderHook(() => useSectionCursor(HEADINGS, 'setup'));
        act(() => result.current.step(-1));

        vi.stubGlobal('scrollY', 300);
        act(() => result.current.step(1));

        expect(scrolled).toEqual(['page top', 'options']);
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
