import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { InteractionDispatcher } from '@src/node/InteractionDispatcher';

import type { ResolvedRoute } from '@src/dispatch/resolve';

const HANDLERS_DIR = path.resolve(__dirname, '../discovery/fixtures/handlers');

function row(kind: ResolvedRoute['kind'], key: string): ResolvedRoute {
    // justified: the guard reads map membership only, never the loader
    return { kind, routeId: `${kind}:${key}`, load: () => Promise.resolve(null) };
}

function dispatcherWith(seed: (d: InteractionDispatcher) => void): {
    dispatcher: InteractionDispatcher;
    warn: ReturnType<typeof vi.fn>;
} {
    const dispatcher = new InteractionDispatcher(HANDLERS_DIR);
    seed(dispatcher);
    const warn = vi.fn();
    Object.assign(dispatcher.logger, { warn });
    return { dispatcher, warn };
}

describe('warnUnhandledRoutes', () => {
    it('warns for a deployed route with no registered handler', () => {
        const { dispatcher, warn } = dispatcherWith((d) => d.maps.slash.set('ping', row('slash', 'ping')));

        dispatcher.warnUnhandledRoutes(['ping', 'admin/ban']);

        expect(warn).toHaveBeenCalledOnce();
        const message = String(warn.mock.calls[0]?.[0]);
        expect(message).toContain('Slash route');
        expect(message).toContain('admin/ban');
        expect(message).toContain('@SlashRoute');
    });

    it('stays quiet when every route is registered', () => {
        const { dispatcher, warn } = dispatcherWith((d) => d.maps.slash.set('ping', row('slash', 'ping')));

        dispatcher.warnUnhandledRoutes(['ping']);

        expect(warn).not.toHaveBeenCalled();
    });
});

describe('warnUnhandledContextMenuRoutes', () => {
    it('checks each kind against its own map', () => {
        const { dispatcher, warn } = dispatcherWith((d) => {
            d.maps.userContextMenu.set('View Profile', row('userContextMenu', 'View Profile'));
        });

        dispatcher.warnUnhandledContextMenuRoutes({
            user: new Set(['View Profile']),
            message: new Set(['Report'])
        });

        expect(warn).toHaveBeenCalledOnce();
        expect(String(warn.mock.calls[0]?.[0])).toContain('Report');
    });

    it('warns per kind for a name registered only on the other kind', () => {
        const { dispatcher, warn } = dispatcherWith((d) => {
            d.maps.userContextMenu.set('Report', row('userContextMenu', 'Report'));
        });

        dispatcher.warnUnhandledContextMenuRoutes({ user: new Set(['Report']), message: new Set(['Report']) });

        expect(warn).toHaveBeenCalledOnce();
        const message = String(warn.mock.calls[0]?.[0]);
        expect(message).toContain('Message context menu');
        expect(message).toContain('Report');
        expect(message).toContain('@ContextMenuRoute');
    });
});
