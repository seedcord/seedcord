import { MotionProvider } from '@seedcord/ui';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TocBar } from '#components/TocBar';

import type { TOCItemType } from 'fumadocs-core/toc';

const ITEMS: readonly TOCItemType[] = [
    { title: 'Do this', url: '#do-this', depth: 2 },
    { title: 'How it works', url: '#how-it-works', depth: 2 },
    { title: 'Related', url: '#related', depth: 2 }
];

const TRIGGER = /On this page/;

function renderBar(): void {
    render(
        <MotionProvider>
            <TocBar items={ITEMS} activeIds={['do-this']} currentId="do-this" pageTitle="The dev loop" />
            <a href="#elsewhere">elsewhere</a>
        </MotionProvider>
    );
}

function trigger(): HTMLElement {
    return screen.getByRole('button', { name: TRIGGER });
}

async function click(element: HTMLElement): Promise<void> {
    await act(async () => {
        fireEvent.click(element);
    });
}

async function pressEscape(): Promise<void> {
    await act(async () => {
        fireEvent.keyDown(window, { key: 'Escape' });
    });
}

describe('TocBar', () => {
    it('names the heading you are in', () => {
        renderBar();

        expect(trigger()).toHaveTextContent('Do this');
    });

    it('names itself without reading the label it is hiding', () => {
        renderBar();

        expect(screen.getByRole('button', { name: /On this page:\s*Do this/ })).toBeInTheDocument();
    });

    it('opens the panel and closes it again', async () => {
        renderBar();

        await click(trigger());
        expect(screen.getByRole('link', { name: 'How it works' })).toBeInTheDocument();

        await click(trigger());
        await waitFor(() => {
            expect(screen.queryByRole('link', { name: 'How it works' })).toBeNull();
        });
    });

    it('closes when a row is picked', async () => {
        renderBar();

        await click(trigger());
        await click(screen.getByRole('link', { name: 'Related' }));

        await waitFor(() => {
            expect(screen.queryByRole('link', { name: 'Related' })).toBeNull();
        });
    });

    it('points aria-controls at the panel it opens', async () => {
        renderBar();

        await click(trigger());
        const controls = trigger().getAttribute('aria-controls');

        expect(controls).toBeTruthy();
        expect(document.getElementById(controls ?? '')).toBeInTheDocument();
    });

    it('returns focus to the trigger when escape closes it', async () => {
        renderBar();

        await click(trigger());
        screen.getByRole('link', { name: 'How it works' }).focus();
        await pressEscape();

        expect(trigger()).toHaveFocus();
    });

    it('leaves focus alone when escape arrives from outside the bar', async () => {
        renderBar();
        const outside = screen.getByRole('link', { name: 'elsewhere' });

        await click(trigger());
        outside.focus();
        await pressEscape();

        expect(outside).toHaveFocus();
    });
});
