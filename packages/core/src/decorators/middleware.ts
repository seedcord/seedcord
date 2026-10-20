import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import { InteractionMiddlewareMetadataKey } from '#src/metadataKeys';

import type { MiddlewareKind } from '#src/metadataKeys';
import type { MiddlewareKindsBrand } from './brands';
import type { Constructor, NonEmptyTuple } from 'type-fest';

/** @internal */
export type AnyMiddlewareCtor = Constructor<unknown, never[]>;

// core cannot import the transport's middleware base. the kinds arrive on a phantom brand.
type KindsOf<TCtor extends AnyMiddlewareCtor> =
    InstanceType<TCtor> extends { [MiddlewareKindsBrand]?: infer Kind extends MiddlewareKind } ? Kind : never;

type AssertMiddlewareKinds<Kinds extends MiddlewareKind, TCtor extends AnyMiddlewareCtor> = [Kinds] extends [
    KindsOf<TCtor>
]
    ? [KindsOf<TCtor>] extends [Kinds]
        ? TCtor
        : Constructor<
              ['the middleware generic declares a kind that RegisterInteractionMiddleware omits', KindsOf<TCtor>]
          >
    : Constructor<['RegisterInteractionMiddleware lists a kind that the middleware generic omits', Kinds]>;

/** Registration options for an interaction middleware. */
export interface InteractionMiddlewareOptions<Kinds extends NonEmptyTuple<MiddlewareKind>> {
    /**
     * Restrict this middleware to certain interaction kinds. The middleware's generic must list the same
     * kinds, or applying the decorator is a compile error. Omit it to run on every repliable kind.
     */
    readonly kinds?: Kinds;
    /**
     * Lower runs earlier. Two middleware sharing a priority run in registration order.
     *
     * @defaultValue 0
     */
    readonly priority?: number;
}

/** @internal */
export interface InteractionMiddlewareMetadata {
    readonly priority: number;
    readonly kinds?: readonly MiddlewareKind[];
}

/**
 * Registers an interaction middleware. It runs after the dispatcher builds the handler and before its
 * gates, over that handler's reply surface.
 *
 * @param options - The kinds this middleware runs on and its ordering.
 * @decorator
 *
 * @example
 * ```ts
 * \@RegisterInteractionMiddleware({ kinds: [InteractionKind.Button], priority: 10 })
 * class Audit extends InteractionMiddleware<InteractionKind.Button> {
 *     async execute() {
 *         this.logger.info(this.dispatch.routeId);
 *     }
 * }
 * ```
 *
 * @throws A **SeedcordTypeError** when `priority` is not a finite number.
 */
export function RegisterInteractionMiddleware<
    const Kinds extends NonEmptyTuple<MiddlewareKind> = NonEmptyTuple<MiddlewareKind>
>(options: InteractionMiddlewareOptions<Kinds> = {}) {
    return function <TCtor extends AnyMiddlewareCtor>(ctor: AssertMiddlewareKinds<Kinds[number], TCtor>): void {
        const priority = Number(options.priority ?? 0);
        if (!Number.isFinite(priority))
            throw new SeedcordTypeError(SeedcordErrorCode.DecoratorInvalidMiddlewarePriority, [
                ctor.name,
                String(options.priority)
            ]);
        if (options.kinds?.length === 0)
            throw new SeedcordTypeError(SeedcordErrorCode.DecoratorEmptyMiddlewareFilter, [ctor.name, 'kinds']);

        const metadata: InteractionMiddlewareMetadata = {
            priority,
            ...(options.kinds && { kinds: options.kinds })
        };

        Reflect.defineMetadata(InteractionMiddlewareMetadataKey, metadata, ctor);
    };
}

/** @internal */
export function interactionMiddlewareMetaOf(constructor: AnyMiddlewareCtor): InteractionMiddlewareMetadata | undefined {
    const saved: unknown = Reflect.getMetadata(InteractionMiddlewareMetadataKey, constructor);
    return saved as InteractionMiddlewareMetadata | undefined;
}
