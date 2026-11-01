import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useHotkeys } from '#src/lib/useHotkeys';

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

    it('leaves a plain key to a field, a dialog, or a control that already took it', () => {
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
            <div role="dialog"><button id="in-dialog"></button></div>
            <button id="taken"></button>
        `;
        const byId = (id: string): HTMLElement => document.getElementById(id) ?? document.body;
        byId('taken').addEventListener('keydown', (event) => event.preventDefault());

        for (const id of ['input', 'textarea', 'editable', 'in-dialog', 'taken']) {
            fireEvent.keyDown(byId(id), { key: 's' });
        }
        fireEvent.keyDown(byId('input'), { key: 'k', metaKey: true });

        expect(switcher).not.toHaveBeenCalled();
        expect(toggle).toHaveBeenCalledOnce();
    });
});
