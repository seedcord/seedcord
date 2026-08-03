import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { ComponentDefsKey } from '@customId/routing';
import {
    SelectMenuKind,
    areRoutes,
    contextMenuRouteOf,
    selectMenuRouteOf,
    storeComponentRoute,
    storeInteractionRoute
} from '@decorators/interactionRoutes';
import { InteractionMetadataKey, InteractionRouteKeys, InteractionRoutes } from '@src/metadataKeys';

import type { AnyCustomId } from '@customId/CustomId';

describe('storeInteractionRoute', () => {
    it('stores routes under the route key and marks the constructor', () => {
        class Handler {
            execute(): void {}
        }
        storeInteractionRoute(InteractionRoutes.Slash, ['ban'], Handler);
        expect(Reflect.getMetadata(InteractionRouteKeys[InteractionRoutes.Slash], Handler)).toEqual(['ban']);
        expect(Reflect.getMetadata(InteractionMetadataKey, Handler)).toBe(true);
    });

    it('accumulates routes across repeated calls', () => {
        class Handler {
            execute(): void {}
        }
        storeInteractionRoute(InteractionRoutes.Slash, ['ban'], Handler);
        storeInteractionRoute(InteractionRoutes.Slash, ['kick'], Handler);
        expect(Reflect.getMetadata(InteractionRouteKeys[InteractionRoutes.Slash], Handler)).toEqual(['ban', 'kick']);
    });

    it('accepts a single route string', () => {
        class Handler {
            execute(): void {}
        }
        storeInteractionRoute(InteractionRoutes.Autocomplete, 'search', Handler);
        expect(Reflect.getMetadata(InteractionRouteKeys[InteractionRoutes.Autocomplete], Handler)).toEqual(['search']);
    });
});

describe('storeComponentRoute', () => {
    it('stores each definition prefix and the definitions themselves', () => {
        class Handler {
            execute(): void {}
        }
        // justified: only the prefix is read by the writer
        const def = { prefix: 'inv' } as unknown as AnyCustomId;
        storeComponentRoute(InteractionRoutes.Button, [def], Handler);
        expect(Reflect.getMetadata(InteractionRouteKeys[InteractionRoutes.Button], Handler)).toEqual(['inv']);
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
        storeComponentRoute(InteractionRoutes.Button, [a, b], Handler);
        expect(Reflect.getMetadata(InteractionRouteKeys[InteractionRoutes.Button], Handler)).toEqual(['inv', 'shop']);
        expect(Reflect.getMetadata(ComponentDefsKey, Handler)).toEqual([a, b]);
    });

    it('accumulates prefixes across calls while the defs key holds the last set', () => {
        class Handler {
            execute(): void {}
        }
        // justified: only the prefix is read by the writer
        const a = { prefix: 'inv' } as unknown as AnyCustomId;
        const b = { prefix: 'shop' } as unknown as AnyCustomId;
        storeComponentRoute(InteractionRoutes.Button, [a], Handler);
        storeComponentRoute(InteractionRoutes.Button, [b], Handler);
        expect(Reflect.getMetadata(InteractionRouteKeys[InteractionRoutes.Button], Handler)).toEqual(['inv', 'shop']);
        expect(Reflect.getMetadata(ComponentDefsKey, Handler)).toEqual([b]);
    });
});

describe('route maps', () => {
    it('maps every select menu kind to its route', () => {
        expect(selectMenuRouteOf(SelectMenuKind.String)).toBe(InteractionRoutes.StringMenu);
        expect(selectMenuRouteOf(SelectMenuKind.User)).toBe(InteractionRoutes.UserMenu);
        expect(selectMenuRouteOf(SelectMenuKind.Role)).toBe(InteractionRoutes.RoleMenu);
        expect(selectMenuRouteOf(SelectMenuKind.Channel)).toBe(InteractionRoutes.ChannelMenu);
        expect(selectMenuRouteOf(SelectMenuKind.Mentionable)).toBe(InteractionRoutes.MentionableMenu);
    });

    it('maps both context menu kinds to their routes', () => {
        expect(contextMenuRouteOf(ApplicationCommandType.User)).toBe(InteractionRoutes.UserContextMenu);
        expect(contextMenuRouteOf(ApplicationCommandType.Message)).toBe(InteractionRoutes.MessageContextMenu);
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
