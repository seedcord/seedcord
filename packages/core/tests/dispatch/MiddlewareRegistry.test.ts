import { SeedcordErrorCode } from '@seedcord/errors';
import { beforeEach, describe, expect, it } from 'vitest';

import { RegisterInteractionMiddleware } from '#decorators/middleware';
import { interactionMiddleware, MiddlewareRegistry } from '#src/dispatch/MiddlewareRegistry';
import { InteractionKind } from '#src/metadataKeys';

import type { MiddlewareKind } from '#src/metadataKeys';

// the registry only reads metadata off the class
type Probe = new () => { execute(): Promise<void> };

// the object key sets the class's name
function middleware(name: string, options: Parameters<typeof RegisterInteractionMiddleware>[0] = {}): Probe {
    const ctor = {
        [name]: class {
            public execute(): Promise<void> {
                return Promise.resolve();
            }
        }
    }[name] as Probe;
    RegisterInteractionMiddleware(options)(ctor as never);
    return ctor;
}

function names(chain: readonly Probe[]): string[] {
    return chain.map((ctor) => ctor.name);
}

let registry: MiddlewareRegistry<Probe>;

beforeEach(() => {
    registry = new MiddlewareRegistry<Probe>(interactionMiddleware);
});

describe('MiddlewareRegistry', () => {
    it('orders a chain by priority', () => {
        registry.register(middleware('Late', { priority: 10 }));
        registry.register(middleware('Early', { priority: 1 }));

        expect(names(registry.chainFor(InteractionKind.Button))).toEqual(['Early', 'Late']);
    });

    it('keeps registration order when two share a priority', () => {
        registry.register(middleware('First', { priority: 5 }));
        registry.register(middleware('Second', { priority: 5 }));
        registry.register(middleware('Third', { priority: 5 }));

        expect(names(registry.chainFor(InteractionKind.Modal))).toEqual(['First', 'Second', 'Third']);
    });

    it('rejects an empty kinds array', () => {
        // justified: the type already rejects this, the throw covers a JS caller
        const register = RegisterInteractionMiddleware as unknown as (o: object) => (ctor: unknown) => void;

        expect(() => register({ kinds: [] })(middleware('Empty'))).toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.DecoratorEmptyMiddlewareFilter })
        );
    });

    it('chains two different classes that share a name', () => {
        const first = middleware('o');
        const second = middleware('o');
        registry.register(first);
        registry.register(second);

        expect(registry.chainFor(InteractionKind.Slash)).toEqual([first, second]);
    });

    it('registers the same class twice without duplicating it', () => {
        const audit = middleware('Audit');
        registry.register(audit);
        registry.register(audit);

        expect(names(registry.chainFor(InteractionKind.Slash))).toEqual(['Audit']);
    });

    it('puts a filtered middleware only in the kinds it lists', () => {
        registry.register(middleware('ButtonOnly', { kinds: [InteractionKind.Button] }));

        expect(names(registry.chainFor(InteractionKind.Button))).toEqual(['ButtonOnly']);
        expect(registry.chainFor(InteractionKind.Slash)).toEqual([]);
    });

    it('puts a catchall in every kind', () => {
        registry.register(middleware('Everywhere'));

        const kinds: MiddlewareKind[] = [
            InteractionKind.Slash,
            InteractionKind.Button,
            InteractionKind.Modal,
            InteractionKind.UserContextMenu
        ];
        for (const kind of kinds) expect(names(registry.chainFor(kind))).toEqual(['Everywhere']);
    });

    it('drops a class from every chain on unregister', () => {
        const audit = middleware('Audit');
        registry.register(audit);
        registry.unregister(audit);

        expect(registry.chainFor(InteractionKind.Button)).toEqual([]);
    });

    it('skips a class the decorator never touched', () => {
        class Undecorated {
            public execute(): Promise<void> {
                return Promise.resolve();
            }
        }

        expect(registry.register(Undecorated)).toBeUndefined();
        expect(registry.chainFor(InteractionKind.Button)).toEqual([]);
    });
});
