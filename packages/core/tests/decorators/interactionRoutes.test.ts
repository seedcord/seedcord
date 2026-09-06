import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { ComponentDefsKey } from '#customId/routing';
import {
    areRoutes,
    contextMenuRouteOf,
    storeComponentRoute,
    storeInteractionRoute
} from '#decorators/interactionRoutes';
import { InteractionMetadataKey, InteractionRouteKeys, InteractionKind } from '#src/metadataKeys';

import type { AnyCustomId } from '@seedcord/custom-id';

describe('storeInteractionRoute', () => {
    it('stores routes under the route key and marks the constructor', () => {
        class Handler {
            execute(): void {}
        }
        storeInteractionRoute(InteractionKind.Slash, ['ban'], Handler);
        expect(Reflect.getMetadata(InteractionRouteKeys[InteractionKind.Slash], Handler)).toEqual(['ban']);
        expect(Reflect.getMetadata(InteractionMetadataKey, Handler)).toBe(true);
    });

    it('accumulates routes across repeated calls', () => {
        class Handler {
            execute(): void {}
        }
        storeInteractionRoute(InteractionKind.Slash, ['ban'], Handler);
        storeInteractionRoute(InteractionKind.Slash, ['kick'], Handler);
        expect(Reflect.getMetadata(InteractionRouteKeys[InteractionKind.Slash], Handler)).toEqual(['ban', 'kick']);
    });

    it('accepts a single route string', () => {
        class Handler {
            execute(): void {}
        }
        storeInteractionRoute(InteractionKind.Autocomplete, 'search', Handler);
        expect(Reflect.getMetadata(InteractionRouteKeys[InteractionKind.Autocomplete], Handler)).toEqual(['search']);
    });
});

describe('storeComponentRoute', () => {
    it('stores each definition prefix and the definitions themselves', () => {
        class Handler {
            execute(): void {}
        }
        // justified: only the prefix is read by the writer
        const def = { prefix: 'inv' } as unknown as AnyCustomId;
        storeComponentRoute(InteractionKind.Button, [def], Handler);
        expect(Reflect.getMetadata(InteractionRouteKeys[InteractionKind.Button], Handler)).toEqual(['inv']);
        expect(Reflect.getMetadata(ComponentDefsKey, Handler)).toEqual([def]);
    });
});

describe('storeComponentRoute multi-def', () => {
    it('stores each definition prefix for multiple defs', () => {
        class Handler {
            execute(): void {}
        }
        // justified: only the prefix is read by the writer
        const a = { prefix: 'inv' } as unknown as AnyCustomId;
        const b = { prefix: 'shop' } as unknown as AnyCustomId;
        storeComponentRoute(InteractionKind.Button, [a, b], Handler);
        expect(Reflect.getMetadata(InteractionRouteKeys[InteractionKind.Button], Handler)).toEqual(['inv', 'shop']);
        expect(Reflect.getMetadata(ComponentDefsKey, Handler)).toEqual([a, b]);
    });

    it('accumulates prefixes across calls while the defs key holds the last set', () => {
        class Handler {
            execute(): void {}
        }
        // justified: only the prefix is read by the writer
        const a = { prefix: 'inv' } as unknown as AnyCustomId;
        const b = { prefix: 'shop' } as unknown as AnyCustomId;
        storeComponentRoute(InteractionKind.Button, [a], Handler);
        storeComponentRoute(InteractionKind.Button, [b], Handler);
        expect(Reflect.getMetadata(InteractionRouteKeys[InteractionKind.Button], Handler)).toEqual(['inv', 'shop']);
        expect(Reflect.getMetadata(ComponentDefsKey, Handler)).toEqual([b]);
    });
});

describe('route maps', () => {
    it('maps both context menu kinds to their routes', () => {
        expect(contextMenuRouteOf(ApplicationCommandType.User)).toBe(InteractionKind.UserContextMenu);
        expect(contextMenuRouteOf(ApplicationCommandType.Message)).toBe(InteractionKind.MessageContextMenu);
    });
});

describe('areRoutes', () => {
    it('accepts only string arrays', () => {
        expect(areRoutes(['a', 'b'])).toBe(true);
        expect(areRoutes([])).toBe(true);
        expect(areRoutes(['a', 1])).toBe(false);
        expect(areRoutes('a')).toBe(false);
    });
});
