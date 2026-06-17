import { runGates } from '@bot/gates/runGates';

import type { Gate, GateContext, GateContextBase } from '@bot/gates';
import type { AnyHandlerCtor, FitAll } from '@bot/gates/matching';
import type { NonEmptyTuple } from 'type-fest';

/** @internal */
export const GatedMetadataKey = Symbol('gated:metadata');

/**
 * Attaches gates to a handler. The gates run before `execute`, and a gate refusing stops the handler with
 * the reply or drop the gate threw. Multiple gates are ANDed, so each must pass. A gate that requires a
 * context the handler does not provide (a button gate on a slash handler, an interaction gate on an event
 * handler) is a compile error at this line, and the error names the gate and the handler kind. Place it
 * above the route decorator.
 *
 * Combine gates with {@link and} or {@link or} to build a single gate from multiple arms.
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
 * @param ctor - The handler class being decorated, rejected at compile time when a gate needs a context it lacks.
 *
 * @see {@link defineGate}
 */
export function Gated<const Gates extends NonEmptyTuple<Gate<GateContextBase>>>(...gates: Gates) {
    // mismatch resolves to the error tuple instead of TCtor, so the class fails to assign and TS names the gate
    return function <TCtor extends AnyHandlerCtor>(
        ctor: FitAll<TCtor, Gates> extends Gates ? TCtor : FitAll<TCtor, Gates>
    ): void {
        const existing = (Reflect.getMetadata(GatedMetadataKey, ctor) as readonly Gate[] | undefined) ?? [];
        Reflect.defineMetadata(GatedMetadataKey, [...existing, ...gates], ctor);
    };
}

/**
 * Runs the gates a handler was decorated with against the given context. The dispatcher calls this before
 * `execute`, inside the boundary, so a refusal renders or drops.
 *
 * @param handlerCtor - The handler class whose attached gates are read from metadata.
 * @param ctx - The context passed to each gate, supplying what the gate checks against.
 */
export async function runHandlerGates(handlerCtor: object, ctx: GateContext): Promise<void> {
    const gates = Reflect.getMetadata(GatedMetadataKey, handlerCtor) as readonly Gate<GateContextBase>[] | undefined;
    if (!gates) return;
    await runGates(gates, ctx);
}
