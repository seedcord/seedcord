import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import type { ValueOf, Promisable } from 'type-fest';

type ResolvedReturn<Case> = Case extends (...args: never[]) => infer Result ? Awaited<Result> : never;

// Ret is never when the caller doesn't write one
export type CaseReturn<Ret> = [Ret] extends [never] ? unknown : Promisable<Ret>;

export type MatchResult<Ret, Cases> = [Ret] extends [never] ? ResolvedReturn<ValueOf<Cases>> : Ret;

// keyof reads discord.js's Events.MessageCreate key and the 'messageCreate' that an author writes as different types
type ShapeKey<Shape> = keyof Shape | `${Extract<keyof Shape, string>}`;

export type OnlyCases<Cases, Shape> = Cases & Record<Exclude<keyof Cases, ShapeKey<Shape>>, never>;

export async function runCase<Result>(
    handler: object,
    cases: object,
    kind: string,
    value: string,
    ...args: unknown[]
): Promise<Result> {
    // hasOwn, since a plain lookup for a key named `constructor` returns Object.prototype's
    const callback = Object.hasOwn(cases, value) ? (cases as Record<string, unknown>)[value] : undefined;
    if (typeof callback !== 'function') {
        throw new SeedcordTypeError(SeedcordErrorCode.MatchCaseMissing, [handler.constructor.name, kind, value]);
    }
    // justified: a case's parameters and result come from the handler's generics, which the runtime key can't check
    return (await (callback as (...params: unknown[]) => unknown)(...args)) as Result;
}
