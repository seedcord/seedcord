import { SeedcordErrorCode } from '@seedcord/errors';
import { ApplicationCommandType } from 'discord-api-types/v10';
import { describe, expect, it } from 'vitest';

import { ComponentDefsKey } from '#customId/routing';
import { contextMenuRouteOf, storeComponentRoute, storeInteractionRoute } from '#decorators/interactionRoutes';
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

    it('throws DecoratorDuplicateKey for a repeated route, including across stacked calls', () => {
        class Repeats {
            execute(): void {}
        }
        class Stacks {
            execute(): void {}
        }
        function expectDuplicate(store: () => void): void {
            expect(store).toThrow(
                expect.objectContaining({
                    code: SeedcordErrorCode.DecoratorDuplicateKey,
                    message: expect.stringContaining('@SlashRoute') as string
                })
            );
        }
        storeInteractionRoute(InteractionKind.Slash, ['ban'], Stacks);

        expectDuplicate(() => storeInteractionRoute(InteractionKind.Slash, ['ban', 'ban'], Repeats));
        expectDuplicate(() => storeInteractionRoute(InteractionKind.Slash, ['ban'], Stacks));
    });

    it("lets a subclass list its parent's route", () => {
        class Parent {
            execute(): void {}
        }
        class Child extends Parent {}
        storeInteractionRoute(InteractionKind.Slash, ['ban'], Parent);

        expect(() => storeInteractionRoute(InteractionKind.Slash, ['ban'], Child)).not.toThrow();
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

    it('throws DecoratorDuplicateKey for two definitions with the same prefix', () => {
        class Handler {
            execute(): void {}
        }
        // justified: only the prefix is read by the writer
        const a = { prefix: 'inv' } as unknown as AnyCustomId;
        const b = { prefix: 'inv' } as unknown as AnyCustomId;
        expect(() => storeComponentRoute(InteractionKind.StringMenu, [a, b], Handler)).toThrow(
            expect.objectContaining({
                code: SeedcordErrorCode.DecoratorDuplicateKey,
                message: expect.stringMatching(/@StringMenuRoute.*own prefix/) as string
            })
        );
    });
});

describe('route maps', () => {
    it('maps both context menu kinds to their routes', () => {
        expect(contextMenuRouteOf(ApplicationCommandType.User)).toBe(InteractionKind.UserContextMenu);
        expect(contextMenuRouteOf(ApplicationCommandType.Message)).toBe(InteractionKind.MessageContextMenu);
    });
});
