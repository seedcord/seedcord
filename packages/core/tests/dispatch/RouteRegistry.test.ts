import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vite-plus/test';

import { storeInteractionRoute } from '#decorators/interactionRoutes';
import { RouteRegistry } from '#src/dispatch/RouteRegistry';
import { InteractionKind } from '#src/metadataKeys';

type Ctor = new () => unknown;
type Slots = Record<InteractionKind, Ctor>;

class Handler {
    public readonly label = 'handler';
}

function handlerOn(...routes: string[]): Ctor {
    const ctor = class extends Handler {};
    storeInteractionRoute(InteractionKind.Button, routes, ctor);
    return ctor;
}

describe('RouteRegistry', () => {
    it('writes none of the routes when a later one belongs to another class', () => {
        const registry = new RouteRegistry<Slots>();
        registry.register(handlerOn('taken'), 'Keeper.ts');

        expect(() => registry.register(handlerOn('free', 'taken'), 'Late.ts')).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreDuplicateName })
        );

        expect(registry.maps[InteractionKind.Button].has('free')).toBe(false);
    });

    it("returns false for a class that doesn't declare routes", () => {
        const registry = new RouteRegistry<Slots>();

        expect(registry.register(Handler, 'Empty.ts')).toBe(false);
    });
});
