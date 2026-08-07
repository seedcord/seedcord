import { GatedMetadataKey } from '@seedcord/core/internal';

import type { AnyHandlerCtor, FitAll } from './matching';
import type { Gate, GateContextBase } from '@seedcord/core';
import type { NonEmptyTuple } from 'type-fest';

/**
 * Attaches gates to an HTTP interaction handler. The gates run before `execute`, and a gate refusing stops
 * the handler with the reply or drop the gate threw. Multiple gates are ANDed. A gate
 * that requires a context the handler does not provide (a button gate on a slash handler, a gate on an
 * autocomplete handler, or a `RequirePermissions([...], { in: 'guild' })` gate the http transport cannot
 * satisfy) is a compile error at this line, and the error names the gate and the handler kind. Place it
 * above the route decorator.
 *
 * Combine gates with {@link and} or {@link or} to build a single gate from multiple arms.
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord-api-types/v10';
 *
 * \@Gated(GuildOnly(), RequirePermissions([PermissionFlagsBits.ManageMessages]))
 * \@SlashRoute('purge')
 * class Purge extends SlashHandler<'purge'> {
 *     async execute() {
 *         // both gates passed, so this runs in a guild with a caller who can moderate this channel
 *     }
 * }
 * ```
 *
 * @typeParam Gates - The non-empty tuple of gates to run, in order, against the handler's context.
 * @typeParam TCtor - The decorated handler's constructor, checked against every gate's required context.
 * @param gates - One or more gates to attach, each ANDed so the handler runs only when all pass.
 * @param ctor - The handler class being decorated, rejected at compile time when a gate requires a context it lacks.
 *
 * @see {@link defineGate}
 * @see {@link defineEffectGate}
 * @decorator
 */
export function Gated<const Gates extends NonEmptyTuple<Gate<GateContextBase>>>(...gates: Gates) {
    // the class fails to assign and TS names the gate
    return function <TCtor extends AnyHandlerCtor>(
        ctor: FitAll<TCtor, Gates> extends Gates ? TCtor : FitAll<TCtor, Gates>
    ): void {
        const existing = (Reflect.getMetadata(GatedMetadataKey, ctor) as readonly Gate[] | undefined) ?? [];
        Reflect.defineMetadata(GatedMetadataKey, [...existing, ...gates], ctor);
    };
}
