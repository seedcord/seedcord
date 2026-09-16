import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useVisibleHeadingIds } from '#lib/visibleHeadings';

import type { TOCItemType } from 'fumadocs-core/toc';

const ITEMS: readonly TOCItemType[] = [
    { title: 'The options', url: '#the-options', depth: 2 },
    { title: 'Replacing the prompt', url: '#replacing-the-prompt', depth: 2 }
];

interface FakeEntryInput {
    target: Element;
    isIntersecting: boolean;
    intersectionRatio?: number;
}

// jsdom ships no IntersectionObserver
class FakeIntersectionObserver {
    public static instances: FakeIntersectionObserver[] = [];
    private readonly targets = new Set<Element>();

    public constructor(private readonly callback: IntersectionObserverCallback) {
        FakeIntersectionObserver.instances.push(this);
    }

    public observe(target: Element): void {
        this.targets.add(target);
    }

    public unobserve(target: Element): void {
        this.targets.delete(target);
    }

    public disconnect(): void {
        this.targets.clear();
    }

    public takeRecords(): IntersectionObserverEntry[] {
        return [];
    }

    public emit(entries: readonly FakeEntryInput[]): void {
        const fullEntries = entries.map((entry) => ({
            ...entry,
            intersectionRatio: entry.intersectionRatio ?? (entry.isIntersecting ? 1 : 0),
            boundingClientRect: entry.target.getBoundingClientRect(),
            intersectionRect: entry.target.getBoundingClientRect(),
            rootBounds: null,
            time: 0
        }));
        // safe: the hook only reads target and isIntersecting off each entry
        this.callback(fullEntries as unknown as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
    }
}

beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
    document.body.innerHTML =
        '<h2 id="the-options">The options</h2><h2 id="replacing-the-prompt">Replacing the prompt</h2>';
});

afterEach(() => {
    document.body.innerHTML = '';
});

describe('useVisibleHeadingIds', () => {
    it('keeps a heading active when a later batch reports only a different heading', () => {
        const { result } = renderHook(() => useVisibleHeadingIds(ITEMS));
        const [observer] = FakeIntersectionObserver.instances;
        if (!observer) throw new Error('no observer created');

        const opts = document.getElementById('the-options');
        const replacing = document.getElementById('replacing-the-prompt');
        if (!opts || !replacing) throw new Error('missing heading elements');

        act(() => {
            observer.emit([{ target: opts, isIntersecting: true }]);
        });
        expect(new Set(result.current)).toEqual(new Set(['the-options']));

        // a second, unrelated heading crossing the threshold must not drop the first
        act(() => {
            observer.emit([{ target: replacing, isIntersecting: true }]);
        });
        expect(new Set(result.current)).toEqual(new Set(['the-options', 'replacing-the-prompt']));
    });

    it('drops a heading once its own entry reports it left the viewport', () => {
        const { result } = renderHook(() => useVisibleHeadingIds(ITEMS));
        const [observer] = FakeIntersectionObserver.instances;
        if (!observer) throw new Error('no observer created');

        const opts = document.getElementById('the-options');
        const replacing = document.getElementById('replacing-the-prompt');
        if (!opts || !replacing) throw new Error('missing heading elements');
        // gives the nearest-heading fallback two distinct positions to choose between
        opts.getBoundingClientRect = () => ({ top: 500 }) as DOMRect;
        replacing.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;

        act(() => {
            observer.emit([{ target: opts, isIntersecting: true }]);
        });
        act(() => {
            observer.emit([{ target: opts, isIntersecting: false }]);
        });

        expect(result.current.has('the-options')).toBe(false);
    });

    it('leaves a partly visible heading inactive', () => {
        const { result } = renderHook(() => useVisibleHeadingIds(ITEMS));
        const [observer] = FakeIntersectionObserver.instances;
        if (!observer) throw new Error('no observer created');

        const opts = document.getElementById('the-options');
        const replacing = document.getElementById('replacing-the-prompt');
        if (!opts || !replacing) throw new Error('missing heading elements');
        opts.getBoundingClientRect = () => ({ top: 500 }) as DOMRect;
        replacing.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;

        act(() => {
            observer.emit([{ target: opts, isIntersecting: true, intersectionRatio: 0.5 }]);
        });

        expect(result.current.has('the-options')).toBe(false);
    });

    it('drops a heading that falls below the threshold while still on screen', () => {
        const { result } = renderHook(() => useVisibleHeadingIds(ITEMS));
        const [observer] = FakeIntersectionObserver.instances;
        if (!observer) throw new Error('no observer created');

        const opts = document.getElementById('the-options');
        const replacing = document.getElementById('replacing-the-prompt');
        if (!opts || !replacing) throw new Error('missing heading elements');
        opts.getBoundingClientRect = () => ({ top: 500 }) as DOMRect;
        replacing.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;

        act(() => {
            observer.emit([{ target: opts, isIntersecting: true, intersectionRatio: 1 }]);
        });
        expect(result.current.has('the-options')).toBe(true);

        act(() => {
            observer.emit([{ target: opts, isIntersecting: true, intersectionRatio: 0.4 }]);
        });
        expect(result.current.has('the-options')).toBe(false);
    });
});
