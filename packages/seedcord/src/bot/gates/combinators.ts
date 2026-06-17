import { Notice } from '@seedcord/kit';
import { NoticeEmbed } from '@seedcord/kit/internal';

import { markCommits, rollbackCommits, runCheck } from './effects';
import { defineGate } from './Gate';

import type { Gate, GateContextBase, RequiredOf } from './Gate';
import type { IntersectRequired, JoinNames, TwoOrMore } from './matching';
import type { ReplyResponse } from '@seedcord/types';

class NotAllowed extends Notice {
    public constructor() {
        super('not allowed');
    }

    public render(): ReplyResponse {
        const embed = new NoticeEmbed('You are not allowed to use this command.');
        return { kind: 'embed', embeds: [embed.component] };
    }
}

class NeedsAny extends Notice {
    public constructor(private readonly summaries: readonly string[]) {
        super('not allowed');
    }

    public render(): ReplyResponse {
        const bullets = this.summaries.map((summary) => `• ${summary}`).join('\n');
        const embed = new NoticeEmbed(`You need any of:\n${bullets}`);
        return { kind: 'embed', embeds: [embed.component] };
    }
}

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
    return defineGate('and', async (ctx) => {
        for (const gate of gates) {
            await runCheck(gate, ctx);
        }
    });
}

// the author's message when every or arm refuses, replacing the default list or neutral refusal
interface OrOptions {
    fail: Notice | ((ctx: GateContextBase) => Notice);
}

// a gate has a check method, the options object does not
function isOrOptions(arg: Gate<GateContextBase> | OrOptions): arg is OrOptions {
    return !('check' in arg);
}

/**
 * Runs each gate in order and passes on the first arm that passes. Takes two or more arms. The
 * required context is the union of the arms, so a handler that matches any one arm fits. When every
 * arm refuses it throws the trailing {@link OrOptions} `fail` if given, else an auto list of the
 * arms derived from the summary field, else {@link NotAllowed}.
 * The trailing options object does not count as an arm.
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
 *
 * @example
 * ```ts
 * // custom refusal when every arm refuses
 * or(OwnerOnly(), RequireRole('123456789012345678'), { fail: new NotAllowedNotice() });
 * ```
 */
export function or<Gates extends TwoOrMore<Gate<GateContextBase>>>(
    ...gates: Gates
): Gate<RequiredOf<Gates[number]>, JoinNames<Gates, ' | '>>;
export function or<Gates extends TwoOrMore<Gate<GateContextBase>>>(
    ...args: [...Gates, OrOptions]
): Gate<RequiredOf<Gates[number]>, JoinNames<Gates, ' | '>>;
export function or(...args: readonly (Gate<GateContextBase> | OrOptions)[]): Gate<GateContextBase> {
    const last = args.at(-1);
    const options = last !== undefined && isOrOptions(last) ? last : undefined;
    const gates = (options ? args.slice(0, -1) : args) as readonly Gate<GateContextBase>[];

    return defineGate('or', async (ctx) => {
        const summaries: string[] = [];
        let everyArmHasSummary = true;
        for (const gate of gates) {
            const mark = markCommits(ctx);
            try {
                await runCheck(gate, ctx);
                return;
            } catch (error) {
                // only a refusal is an arm declining, a Fault, a Silence, or a raw error stops everything
                if (error instanceof Notice && !error.report) {
                    // the arm may have queued an effect's commit before refusing, drop it so the winner does not carry it
                    rollbackCommits(ctx, mark);
                    if (error.summary === undefined) everyArmHasSummary = false;
                    else summaries.push(error.summary);
                    continue;
                }
                throw error;
            }
        }
        if (options) throw typeof options.fail === 'function' ? options.fail(ctx) : options.fail;
        // the auto-list shows only when every refusal gave a summary, a partial list would mislead by omission
        if (everyArmHasSummary && summaries.length > 0) throw new NeedsAny(summaries);
        throw new NotAllowed();
    });
}
