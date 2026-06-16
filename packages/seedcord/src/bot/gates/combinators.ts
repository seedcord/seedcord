import { Notice } from '@seedcord/kit';
import { NoticeEmbed } from '@seedcord/kit/internal';

import { defineGate } from './Gate';

import type { Gate, GateContextBase, RequiredOf } from './Gate';
import type { ReplyResponse } from '@seedcord/types';
import type { NonEmptyTuple } from 'type-fest';

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

// intersects each arm's required context atomically. type-fest UnionToIntersection would split a gate whose
// context is itself a union (the full GateContext) into never, this keeps each arm whole.
type IntersectRequired<Gates extends readonly Gate<GateContextBase>[]> = Gates extends readonly [
    infer First extends Gate<GateContextBase>,
    ...infer Rest extends readonly Gate<GateContextBase>[]
]
    ? RequiredOf<First> & IntersectRequired<Rest>
    : unknown;

/** Runs each gate in order and refuses on the first refusal. The required context is the intersection of the arms. */
export function and<Gates extends NonEmptyTuple<Gate<GateContextBase>>>(
    ...gates: Gates
): Gate<IntersectRequired<Gates> & GateContextBase>;
export function and(...gates: readonly Gate<GateContextBase>[]): Gate<GateContextBase> {
    return defineGate('and', async (ctx) => {
        for (const gate of gates) {
            await gate.check(ctx);
        }
    });
}

// the author's message when every or arm refuses, replacing the default list or neutral refusal
interface OrOptions {
    fail: Notice | ((ctx: GateContextBase) => Notice);
}

// the trailing arg is the options object when it is not a gate, because a gate has a check method
function isOrOptions(arg: Gate<GateContextBase> | OrOptions): arg is OrOptions {
    return !('check' in arg);
}

/** Runs each gate in order and passes on the first arm that passes. The required context is the union of the arms. */
export function or<Gates extends NonEmptyTuple<Gate<GateContextBase>>>(
    ...gates: Gates
): Gate<RequiredOf<Gates[number]>>;
export function or<Gates extends NonEmptyTuple<Gate<GateContextBase>>>(
    ...args: [...Gates, OrOptions]
): Gate<RequiredOf<Gates[number]>>;
export function or(...args: readonly (Gate<GateContextBase> | OrOptions)[]): Gate<GateContextBase> {
    const last = args.at(-1);
    const options = last !== undefined && isOrOptions(last) ? last : undefined;
    // the options is split off the end, so the rest are gates
    const gates = (options ? args.slice(0, -1) : args) as readonly Gate<GateContextBase>[];

    return defineGate('or', async (ctx) => {
        const summaries: string[] = [];
        let everyArmHasSummary = true;
        for (const gate of gates) {
            try {
                await gate.check(ctx);
                return;
            } catch (error) {
                // only a refusal is an arm declining, a Fault, a Silence, or a raw error stops everything
                if (error instanceof Notice && !error.report) {
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
