import { fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { useHotkeys } from '#src/lib/useHotkeys.ts';

// the worker runs other files in this document after these tests
afterEach(() => {
    document.body.innerHTML = '';
    globalThis.getSelection()?.removeAllRanges();
});

describe('useHotkeys', () => {
    it('runs the row whose key was pressed', () => {
        const search = vi.fn();
        const next = vi.fn();
        renderHook(() =>
            useHotkeys([
                { key: '/', description: 'Search', run: search },
                { key: 'ArrowRight', description: 'Next page', run: next }
            ])
        );

        fireEvent.keyDown(document.body, { key: 'ArrowRight' });

        expect(next).toHaveBeenCalledOnce();
        expect(search).not.toHaveBeenCalled();
    });

    it('runs a mod row with ⌘ or Ctrl held, and a plain row only without them', () => {
        const toggle = vi.fn();
        const switcher = vi.fn();
        renderHook(() =>
            useHotkeys([
                { key: 'k', mod: true, description: 'Search', run: toggle },
                { key: 's', description: 'Switch site', run: switcher }
            ])
        );

        fireEvent.keyDown(document.body, { key: 'k' });
        fireEvent.keyDown(document.body, { key: 'K', metaKey: true });
        fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true });
        fireEvent.keyDown(document.body, { key: 's', metaKey: true });
        fireEvent.keyDown(document.body, { key: 's', altKey: true });

        expect(toggle).toHaveBeenCalledTimes(2);
        expect(switcher).not.toHaveBeenCalled();
    });

    it('leaves a plain key to a field or a control that already took it', () => {
        const toggle = vi.fn();
        const switcher = vi.fn();
        renderHook(() =>
            useHotkeys([
                { key: 'k', mod: true, description: 'Search', run: toggle },
                { key: 's', description: 'Switch site', run: switcher }
            ])
        );
        document.body.innerHTML = `
            <input id="input" />
            <textarea id="textarea"></textarea>
            <div id="editable" contenteditable="true"></div>
            <button id="taken"></button>
        `;
        const byId = (id: string): HTMLElement => document.getElementById(id) ?? document.body;
        byId('taken').addEventListener('keydown', (event) => event.preventDefault());

        for (const id of ['input', 'textarea', 'editable', 'taken']) {
            fireEvent.keyDown(byId(id), { key: 's' });
        }
        fireEvent.keyDown(byId('input'), { key: 'k', metaKey: true });

        expect(switcher).not.toHaveBeenCalled();
        expect(toggle).toHaveBeenCalledOnce();
    });

    it('tells ← from ⇧← and ignores Shift on keys that type a character', () => {
        const page = vi.fn();
        const tab = vi.fn();
        const shortcuts = vi.fn();
        renderHook(() =>
            useHotkeys([
                { key: 'ArrowRight', description: 'Next page', run: page },
                { key: 'ArrowRight', shift: true, description: 'Next tab', run: tab },
                { key: '?', description: 'Show keyboard shortcuts', run: shortcuts }
            ])
        );

        fireEvent.keyDown(document.body, { key: 'ArrowRight' });
        fireEvent.keyDown(document.body, { key: 'ArrowRight', shiftKey: true });
        fireEvent.keyDown(document.body, { key: '?', shiftKey: true });

        expect(page).toHaveBeenCalledOnce();
        expect(tab).toHaveBeenCalledOnce();
        expect(shortcuts).toHaveBeenCalledOnce();
    });

    it('leaves the arrows to a text selection', () => {
        const page = vi.fn();
        const tab = vi.fn();
        const search = vi.fn();
        renderHook(() =>
            useHotkeys([
                { key: 'ArrowRight', description: 'Next page', run: page },
                { key: 'ArrowRight', shift: true, description: 'Next tab', run: tab },
                { key: '/', description: 'Search', run: search }
            ])
        );
        document.body.innerHTML = '<p id="text">some selected words</p>';
        const text = document.getElementById('text')?.firstChild ?? document.body;
        globalThis.getSelection()?.setBaseAndExtent(text, 0, text, 4);

        fireEvent.keyDown(document.body, { key: 'ArrowRight' });
        fireEvent.keyDown(document.body, { key: 'ArrowRight', shiftKey: true });
        fireEvent.keyDown(document.body, { key: '/' });

        expect(page).not.toHaveBeenCalled();
        expect(tab).not.toHaveBeenCalled();
        expect(search).toHaveBeenCalledOnce();
    });
});
