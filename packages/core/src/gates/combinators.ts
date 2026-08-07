import { NeedsAny, NotAllowed } from '@notices/index';
import { Fault } from '@stops/Fault';
import { Notice } from '@stops/Notice';

import { markCommits, rollbackCommits, runCheck } from './effects';
import { defineGate } from './Gate';

import type { Gate, GateContextBase, RequiredOf } from './Gate';
import type { IntersectRequired, JoinNames, TwoOrMore } from './matching';

/**
 * Runs each gate in order and refuses on the first refusal. Takes two or more arms. The required
 * context is the intersection of the arms, so an event-only and an interaction-only gate cannot be
 * combined.
 *
 * @typeParam Gates - The tuple of two or more gate arms, run left to right.
 * @param gates - The gate arms to run in order, all refused on the first refusal.
 *
 * @see {@link or}
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 *
 * \@Gated(and(GuildOnly(), RequirePermissions([PermissionFlagsBits.BanMembers])))
 * \@SlashRoute('ban')
 * class BanHandler extends SlashHandler<'ban'> {
 *     async execute() {
 *         // ...
 *     }
 * }
 * ```
 */
export function and<Gates extends TwoOrMore<Gate<GateContextBase>>>(
    ...gates: Gates
): Gate<IntersectRequired<Gates> & GateContextBase, JoinNames<Gates, ' & '>>;
export function and(...gates: readonly Gate<GateContextBase>[]): Gate<GateContextBase> {
    return defineGate(gates.map((gate) => gate.name).join(' & '), async (ctx) => {
        for (const gate of gates) {
            await runCheck(gate, ctx);
        }
    });
}

// the caller-supplied refusal when every or arm refuses, replacing the default list or neutral refusal
interface OrOptions {
    fail: Notice | ((ctx: GateContextBase) => Notice);
}

// a gate has a check method, but the options object does not
function isOrOptions(arg: Gate<GateContextBase> | OrOptions): arg is OrOptions {
    return !('check' in arg);
}

/**
 * Runs each gate in order and passes on the first arm that passes. Takes two or more arms. The
 * required context is the union of the arms. A handler that matches any one arm fits. When every
 * arm refuses it throws the trailing {@link OrOptions} `fail` if given, else an auto list of the
 * arms derived from the summary field, else a default refusal. The trailing options object does not
 * count as an arm.
 *
 * @typeParam Gates - The tuple of two or more gate arms, tried left to right.
 * @param gates - The gate arms to try in order, with an optional trailing {@link OrOptions} object.
 *
 * @see {@link and}
 *
 * @example
 * ```ts
 * \@Gated(or(OwnerOnly(), RequireRole('123456789012345678')))
 * \@SlashRoute('admin')
 * class AdminHandler extends SlashHandler<'admin'> {
 *     async execute() {
 *         // ...
 *     }
 * }
 * ```
 */
export function or<Gates extends TwoOrMore<Gate<GateContextBase>>>(
    ...gates: Gates
): Gate<RequiredOf<Gates[number]>, JoinNames<Gates, ' | '>>;
/**
 * @example
 * ```ts
 * // custom refusal when every arm refuses
 * or(OwnerOnly(), RequireRole('123456789012345678'), { fail: new NotAllowedNotice() });
 * ```
 */
export function or<Gates extends TwoOrMore<Gate<GateContextBase>>>(
    ...args: [...Gates, OrOptions]
): Gate<RequiredOf<Gates[number]>, JoinNames<Gates, ' | '>>;
export function or(...args: readonly (Gate<GateContextBase> | OrOptions)[]): Gate<GateContextBase> {
    const last = args.at(-1);
    const options = last !== undefined && isOrOptions(last) ? last : undefined;
    const gates = (options ? args.slice(0, -1) : args) as readonly Gate<GateContextBase>[];

    return defineGate(gates.map((gate) => gate.name).join(' | '), async (ctx) => {
        const summaries: string[] = [];
        let everyArmHasSummary = true;
        for (const gate of gates) {
            const mark = markCommits(ctx);
            try {
                await runCheck(gate, ctx);
                return;
            } catch (error) {
                // only a refusal counts as an arm declining. a Fault (even report-false), a Silence, or a raw error stops everything
                if (error instanceof Notice && !(error instanceof Fault) && !error.report) {
                    // the arm may have queued an effect's commit before refusing, so drop it before the winner carries it
                    rollbackCommits(ctx, mark);
                    if (error.summary === undefined) everyArmHasSummary = false;
                    else summaries.push(error.summary);
                    continue;
                }
                throw error;
            }
        }
        if (options) throw typeof options.fail === 'function' ? options.fail(ctx) : options.fail;
        // the auto-list shows only when every refusal gave a summary, because a partial list would mislead by omission
        if (everyArmHasSummary && summaries.length > 0) throw new NeedsAny(summaries);
        throw new NotAllowed();
    });
}
