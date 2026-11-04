import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { GuideSearch } from '#components/GuideSearch.tsx';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

const COOLDOWN = [{ path: '/checks/cooldown/', tab: 'Checks', page: 'Cooldowns' }];

// jsdom omits ResizeObserver and scrollTo on an element
function serving(): void {
    Element.prototype.scrollTo = (): void => undefined;
    vi.stubGlobal(
        'ResizeObserver',
        class {
            observe = (): void => undefined;
            disconnect = (): void => undefined;
        }
    );
    vi.stubGlobal('fetch', (input: string | URL) => {
        const url = new URL(input, 'https://seedcord.org');
        if (url.pathname.endsWith('/sections.json')) return Promise.resolve(Response.json([]));
        return url.searchParams.get('q') === 'cooldown'
            ? Promise.resolve(Response.json(COOLDOWN))
            : new Promise<Response>(() => undefined);
    });
}

afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(Element.prototype, 'scrollTo');
});

describe('GuideSearch', () => {
    it('opens nothing on Enter while the rows on screen answer the previous question', async () => {
        serving();
        const push = vi.fn();
        const unused = (): void => undefined;
        const router: AppRouterInstance = {
            push,
            replace: unused,
            refresh: unused,
            back: unused,
            forward: unused,
            prefetch: unused,
            bfcacheId: ''
        };
        render(
            <AppRouterContext.Provider value={router}>
                <GuideSearch open onOpenChange={unused} />
            </AppRouterContext.Provider>
        );
        const field = screen.getByRole('combobox');

        fireEvent.change(field, { target: { value: 'cooldown' } });
        await waitFor(() => expect(screen.getByRole('option', { name: 'Cooldowns, Checks' })).toBeInTheDocument());

        fireEvent.change(field, { target: { value: 'kysely' } });
        expect(screen.getByRole('option', { name: 'Cooldowns, Checks' })).toBeInTheDocument();
        fireEvent.keyDown(field, { key: 'Enter' });

        expect(push).not.toHaveBeenCalled();
    });
});
