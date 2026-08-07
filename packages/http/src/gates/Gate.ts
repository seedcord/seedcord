import type { Core } from '@interfaces/Core';
import type { GateContextBase } from '@seedcord/core';
import type { Repliables } from '@src/handlers/interactionTypes';
import type { APIInteractionGuildMember, APIUser } from 'discord-api-types/v10';

/**
 * The interaction gate context on the HTTP transport. It extends the scalar {@link GateContextBase} with the
 * raw interaction payload and the user and member the payload carries. A gate reading button fields, inferred
 * from its `ctx` annotation, is rejected on a slash handler.
 *
 * The http transport delivers no role-derived permission sets, so `memberGuildPermissions` and
 * `appGuildPermissions` are absent. A gate requiring `GuildPermissionsContext` (a permission gate with
 * `in: 'guild'`) is a compile error on an http handler.
 *
 * @typeParam Repliable - The interaction type the gate reads, narrowing which handlers accept it.
 *
 * @example
 * ```ts
 * import type { APIMessageComponentButtonInteraction } from 'discord-api-types/v10';
 *
 * // a button-only gate: the Repliable generic narrows which handlers accept it
 * const ButtonGate = defineGate('btn', (ctx: InteractionGateContext<APIMessageComponentButtonInteraction>) => {
 *     void ctx.interaction; // APIMessageComponentButtonInteraction
 * });
 * ```
 */
export interface InteractionGateContext<Repliable extends Repliables = Repliables> extends GateContextBase {
    /** Narrow on this before reading `interaction`. */
    readonly kind: 'interaction';
    readonly core: Core;
    /** The raw interaction payload, which is the reply target. */
    readonly interaction: Repliable;
    /** Every repliable interaction contains a user. */
    readonly user: APIUser;
    /** The invoking member, or null in a DM. */
    readonly member: APIInteractionGuildMember | null;
}
