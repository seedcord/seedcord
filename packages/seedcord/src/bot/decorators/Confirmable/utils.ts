import type { ConfirmableContext, ConfirmableFactory } from './types';
import type { Repliables } from '@handlers/BaseHandler';
import type { MessageComponentInteraction } from 'discord.js';
import type { Promisable } from 'type-fest';

export const resolveFactory = async <TValue>(
    input: ConfirmableFactory<TValue>,
    ctx: ConfirmableContext
): Promise<TValue> =>
    typeof input === 'function' ? await (input as (c: ConfirmableContext) => Promisable<TValue>)(ctx) : input;

export const isMessageComponentIx = (ix: Repliables): ix is Repliables & MessageComponentInteraction =>
    'deferUpdate' in ix && 'customId' in ix;
