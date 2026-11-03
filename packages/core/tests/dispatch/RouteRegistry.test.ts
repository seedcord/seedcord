import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vitest';

import { storeInteractionRoute } from '#decorators/interactionRoutes';
import { RouteRegistry } from '#src/dispatch/RouteRegistry';
import { InteractionKind } from '#src/metadataKeys';

type Ctor = new () => unknown;

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
        const registry = new RouteRegistry<Ctor>();
        registry.register(handlerOn('taken'), 'Keeper.ts');

        expect(() => registry.register(handlerOn('free', 'taken'), 'Late.ts')).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreDuplicateName })
        );

        expect(registry.maps[InteractionKind.Button].has('free')).toBe(false);
    });

    it("leaves another class's route alone when a stale route id reaches unregister", () => {
        const registry = new RouteRegistry<Ctor>();
        const keeper = handlerOn('shared');
        const stale = handlerOn('own');
        registry.register(keeper, 'Keeper.ts');
        registry.register(stale, 'Stale.ts');

        registry.unregister(stale, [...registry.routesOf(keeper), ...registry.routesOf(stale)]);

        expect(registry.maps[InteractionKind.Button].get('shared')?.ctor).toBe(keeper);
        expect(registry.maps[InteractionKind.Button].has('own')).toBe(false);
    });

    it('returns false for a class that declares no routes', () => {
        const registry = new RouteRegistry<Ctor>();

        expect(registry.register(Handler, 'Empty.ts')).toBe(false);
    });
});
