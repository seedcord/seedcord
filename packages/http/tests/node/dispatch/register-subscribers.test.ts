import { Bus } from '@seedcord/core';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, it, expect, vi } from 'vitest';

import { registerSubscribers } from '@src/dispatch/registerSubscribers';
import { EMPTY_MANIFEST } from '@src/manifest/RouteManifest';
import { Subscriber } from '@subscribers/index';

import type { CoreBase } from '@seedcord/core';
import type { RouteManifest } from '@src/manifest/RouteManifest';

// justified: the Bus only stores core, no member is read during publish
function stubBus(): Bus {
    return new Bus({} as unknown as CoreBase);
}

function manifestWith(load: () => Promise<Record<string, unknown>>): RouteManifest {
    return {
        ...EMPTY_MANIFEST,
        subscriberRoutes: [
            { keys: ['unknownException'], frequency: 'on', exportName: 'Reporter', from: 'src/Reporter.ts', load }
        ]
    };
}

const payload = (): { uuid: `${string}-${string}-${string}-${string}-${string}`; error: Error } => ({
    uuid: crypto.randomUUID(),
    error: new Error('boom')
});

// the Bus logs the subscriber failure with the thrown error as the last argument
function loggedCause(spy: { mock: { calls: unknown[][] } }): unknown {
    return spy.mock.calls[0]?.at(-1);
}

describe('registerSubscribers', () => {
    it('registers a row without importing its module', () => {
        const load = vi.fn();
        registerSubscribers(stubBus(), manifestWith(load));

        expect(load).not.toHaveBeenCalled();
    });

    it('resolves and runs the row on the first publish of its key', async () => {
        const ran: string[] = [];
        class Reporter extends Subscriber<'unknownException'> {
            execute(): Promise<void> {
                ran.push('reporter');
                return Promise.resolve();
            }
        }
        const load = vi.fn().mockResolvedValue({ Reporter });

        const bus = stubBus();
        registerSubscribers(bus, manifestWith(load));
        bus.publish('unknownException', payload());
        await vi.waitFor(() => {
            expect(ran).toEqual(['reporter']);
        });

        expect(load).toHaveBeenCalledTimes(1);
    });

    it('logs a row whose export is not a subscriber', async () => {
        const bus = stubBus();
        const error = vi.spyOn(bus.logger, 'error');
        registerSubscribers(
            bus,
            manifestWith(() =>
                Promise.resolve({
                    Reporter: class NotASubscriber {
                        execute(): Promise<void> {
                            return Promise.resolve();
                        }
                    }
                })
            )
        );

        bus.publish('unknownException', payload());

        await vi.waitFor(() => {
            const cause = loggedCause(error);
            expect(isSeedcordError(cause, undefined, SeedcordErrorCode.SubscriberRouteNotASubscriber)).toBe(true);
            expect((cause as Error).message).toContain('src/Reporter.ts');
        });
    });

    it('translates a row whose module throws while importing, keeping the cause', async () => {
        const bus = stubBus();
        const error = vi.spyOn(bus.logger, 'error');
        const boom = new Error('module init exploded');
        registerSubscribers(
            bus,
            manifestWith(() => Promise.reject(boom))
        );

        bus.publish('unknownException', payload());

        await vi.waitFor(() => {
            const cause = loggedCause(error);
            expect(isSeedcordError(cause, undefined, SeedcordErrorCode.RouteModuleLoadFailed)).toBe(true);
            expect((cause as Error).message).toContain('src/Reporter.ts');
            expect((cause as Error).cause).toBe(boom);
        });
    });

    it('logs a row whose named export is missing', async () => {
        const bus = stubBus();
        const error = vi.spyOn(bus.logger, 'error');
        registerSubscribers(
            bus,
            manifestWith(() => Promise.resolve({}))
        );

        bus.publish('unknownException', payload());

        await vi.waitFor(() => {
            const cause = loggedCause(error);
            expect(isSeedcordError(cause, undefined, SeedcordErrorCode.InteractionRouteExportMissing)).toBe(true);
            expect((cause as Error).message).toContain('Reporter');
        });
    });
});
