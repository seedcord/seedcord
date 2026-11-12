import path from 'node:path';

import { InteractionKind } from '@seedcord/core';
import { PluginRegistry } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { afterEach, describe, expect, it, vi, type MockInstance } from 'vite-plus/test';

import { UnhandledRepliable } from '#handlers/defaults/UnhandledRepliable';
import { InteractionDispatcher } from '#src/dispatch/InteractionDispatcher';

import type { HandlerSlots } from '#handlers/constructors';
import type { MiddlewareKind } from '@seedcord/core';
import type { RegisteredRoute } from '@seedcord/core/internal';

const HANDLERS_DIR = path.resolve(__dirname, '../discovery/fixtures/handlers');

function route<Kind extends MiddlewareKind>(kind: Kind, key: string): RegisteredRoute<HandlerSlots[Kind], Kind> {
    // the guard reads map membership only
    return { kind, route: key, fallback: false, ctor: UnhandledRepliable };
}

function dispatcherWith(seed: (d: InteractionDispatcher) => void): {
    dispatcher: InteractionDispatcher;
    warn: MockInstance<Logger['warn']>;
} {
    const dispatcher = new InteractionDispatcher(new PluginRegistry(), HANDLERS_DIR);
    seed(dispatcher);
    return { dispatcher, warn: vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined) };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('warnUnhandledRoutes', () => {
    it('warns for a deployed route with no registered handler', () => {
        const { dispatcher, warn } = dispatcherWith((d) =>
            d.maps[InteractionKind.Slash].set('ping', route(InteractionKind.Slash, 'ping'))
        );

        dispatcher.warnUnhandledRoutes(['ping', 'admin/ban']);

        expect(warn).toHaveBeenCalledOnce();
        const message = String(warn.mock.calls[0]?.[0]);
        expect(message).toContain('Slash route');
        expect(message).toContain('admin/ban');
        expect(message).toContain('@SlashRoute');
    });

    it('is silent when every route is registered', () => {
        const { dispatcher, warn } = dispatcherWith((d) =>
            d.maps[InteractionKind.Slash].set('ping', route(InteractionKind.Slash, 'ping'))
        );

        dispatcher.warnUnhandledRoutes(['ping']);

        expect(warn).not.toHaveBeenCalled();
    });
});

describe('warnUnhandledContextMenuRoutes', () => {
    it('checks each kind against its own map', () => {
        const { dispatcher, warn } = dispatcherWith((d) => {
            d.maps[InteractionKind.UserContextMenu].set(
                'View Profile',
                route(InteractionKind.UserContextMenu, 'View Profile')
            );
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
            d.maps[InteractionKind.UserContextMenu].set('Report', route(InteractionKind.UserContextMenu, 'Report'));
        });

        dispatcher.warnUnhandledContextMenuRoutes({ user: new Set(['Report']), message: new Set(['Report']) });

        expect(warn).toHaveBeenCalledOnce();
        const message = String(warn.mock.calls[0]?.[0]);
        expect(message).toContain('Message context menu');
        expect(message).toContain('Report');
        expect(message).toContain('@MessageContextMenuRoute');
    });
});
