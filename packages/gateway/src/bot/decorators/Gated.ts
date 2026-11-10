import { GatedMetadataKey } from '@seedcord/core/internal';

import type { AnyHandlerCtor, FitAll } from '#bot/gates/matching';
import type { Gate, GateContextBase } from '@seedcord/core';
import type { NonEmptyTuple } from 'type-fest';

/**
 * Attaches gates to a handler. The gates run before `execute`, and a gate refusing stops the handler with
 * the reply or `Silence` that the gate threw. Multiple gates are ANDed, so each must pass. A gate that requires a
 * context that the handler does not provide (a button gate on a slash handler, an interaction gate on an event
 * handler) is a compile error at this line, and the error message shows the gate and the handler kind. Place it
 * above the route decorator.
 *
 * Combine gates into a single gate with {@link and} or {@link or}.
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 *
 * \@Gated(GuildOnly(), RequirePermissions([PermissionFlagsBits.Administrator]))
 * \@SlashRoute('maintenance')
 * class Maintenance extends SlashHandler<'maintenance'> {
 *     async execute() {
 *         // both gates passed, so this runs in a guild with an admin caller
 *     }
 * }
 * ```
 *
 * @typeParam Gates - The non-empty tuple of gates to run, in order, against the handler's context.
 * @typeParam TCtor - The decorated handler's constructor, checked against every gate's required context.
 * @param gates - One or more gates to attach, each ANDed so the handler runs only when all pass.
 * @param ctor - The handler class being decorated, rejected at compile time when a gate needs a context it doesn't have.
 *
 * @see {@link defineGate}
 * @see {@link defineEffectGate}
 * @decorator
 */
export function Gated<const Gates extends NonEmptyTuple<Gate<GateContextBase>>>(...gates: Gates) {
    // a mismatch resolves to the error tuple. the TS error then shows the gate
    return function <TCtor extends AnyHandlerCtor>(
        ctor: FitAll<TCtor, Gates> extends Gates ? TCtor : FitAll<TCtor, Gates>
    ): void {
        const existing = (Reflect.getMetadata(GatedMetadataKey, ctor) as readonly Gate[] | undefined) ?? [];
        Reflect.defineMetadata(GatedMetadataKey, [...existing, ...gates], ctor);
    };
}
