import 'reflect-metadata';

import { InteractionKind } from '@seedcord/core';
import { InteractionMiddlewareMetadataKey, storeInteractionRoute } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { InteractionMiddleware } from '#handlers/interaction/InteractionMiddleware';
import { SlashHandler } from '#handlers/interaction/SlashHandler';

import { readyEngine } from './harness';
import { manifestWith } from '../../helpers/fixtures';

class Undecorated extends SlashHandler<never> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}

class Unregistered extends InteractionMiddleware {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }
}

// @SlashRoute would reject this class
class ForeignHandler {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
storeInteractionRoute(InteractionKind.Slash, 'ban', ForeignHandler);

class ForeignMiddleware {
    public async execute(): Promise<void> {
        await Promise.resolve();
    }
}
Reflect.defineMetadata(InteractionMiddlewareMetadataKey, { priority: 0 }, ForeignMiddleware);

// the build writes this manifest. the compiler never checks its entries.
describe('the manifest boundary', () => {
    it('reports a handler that does not extend an http base', async () => {
        await expect(readyEngine(manifestWith({ handlers: [ForeignHandler as never] }))).rejects.toMatchObject({
            code: SeedcordErrorCode.ManifestEntryWrongClass
        });
    });

    it('reports a middleware that does not extend an http base', async () => {
        await expect(readyEngine(manifestWith({ middleware: [ForeignMiddleware as never] }))).rejects.toMatchObject({
            code: SeedcordErrorCode.ManifestEntryWrongClass
        });
    });

    it('reports an entry that is not a class at all', async () => {
        await expect(readyEngine(manifestWith({ handlers: [null as never] }))).rejects.toMatchObject({
            code: SeedcordErrorCode.ManifestEntryWrongClass
        });
    });

    it('reports a handler that declares no route', async () => {
        await expect(readyEngine(manifestWith({ handlers: [Undecorated] }))).rejects.toMatchObject({
            code: SeedcordErrorCode.ManifestEntryNoRoutes
        });
    });

    it('reports a middleware carrying no decorator', async () => {
        await expect(readyEngine(manifestWith({ middleware: [Unregistered] }))).rejects.toMatchObject({
            code: SeedcordErrorCode.ManifestEntryNoRoutes
        });
    });
});
