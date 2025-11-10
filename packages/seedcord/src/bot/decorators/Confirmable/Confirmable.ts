import { SeedcordError, SeedcordErrorCode } from '@seedcord/services';
import { ComponentType } from 'discord.js';

import type {
    ConfirmableFactory,
    ConfirmableContext,
    ConfirmableOptions,
    ConfirmableComponentsV2Options,
    ConfirmableClassicOptions,
    ResolverSource,
    CustomIdSource,
    ConfirmablePayload,
    RowLike,
    ClassicPayload,
    OutcomeUiV2,
    OutcomeUiClassic,
    QuestionInput,
    ComponentInteractionFor,
    MaybeClearedClassic
} from './types';
import type { Repliables, RepliableInteractionHandler } from '@interfaces/Handler';
import type { MessageComponentType, MessageComponentInteraction, Message } from 'discord.js';
import type { Promisable, NonEmptyTuple } from 'type-fest';

/* utils */

const resolveFactory = async <TValue>(input: ConfirmableFactory<TValue>, ctx: ConfirmableContext): Promise<TValue> =>
    typeof input === 'function' ? await (input as (c: ConfirmableContext) => Promisable<TValue>)(ctx) : input;

const isV2 = <TComponentType extends MessageComponentType>(
    opts: ConfirmableOptions<TComponentType>
): opts is ConfirmableComponentsV2Options<TComponentType> => 'container' in opts;

const usesResolver = <TComponentType extends MessageComponentType>(
    opts: ConfirmableOptions<TComponentType>
): opts is
    | (ConfirmableClassicOptions<TComponentType> & ResolverSource<TComponentType>)
    | (ConfirmableComponentsV2Options<TComponentType> & ResolverSource<TComponentType>) => 'resolveDecision' in opts;

const usesCustomIds = <TComponentType extends MessageComponentType>(
    opts: ConfirmableOptions<TComponentType>
): opts is ConfirmableOptions<TComponentType> & CustomIdSource => 'confirmCustomIds' in opts;

const isMessageComponentIx = (ix: Repliables): ix is Repliables & MessageComponentInteraction =>
    'deferUpdate' in ix && 'customId' in ix;

/* payload builders */

const buildPrompt = async <TComponentType extends MessageComponentType>(
    opts: ConfirmableOptions<TComponentType>,
    ctx: ConfirmableContext
): Promise<ConfirmablePayload> => {
    if (isV2(opts)) {
        const container = await resolveFactory(opts.container, ctx);
        return { flags: 'IsComponentsV2', components: [container.component] };
    }

    const prompt = await resolveFactory(opts.prompt, ctx);
    const rows = await resolveFactory(opts.rows, ctx);
    const components = [...rows] as NonEmptyTuple<RowLike>;

    const payload: ClassicPayload = { components };

    if (typeof prompt === 'string') payload.content = prompt;
    else payload.embeds = [prompt.component];

    return payload;
};

const clearedPayload = <TComponentType extends MessageComponentType>(
    opts: ConfirmableOptions<TComponentType>
): ConfirmablePayload =>
    isV2(opts) ? { flags: 'IsComponentsV2', components: [] } : { components: [] as readonly RowLike[] };

/* decision */

const decide = async <TComponentType extends MessageComponentType>(
    opts: ConfirmableOptions<TComponentType>,
    i: MessageComponentInteraction
): Promise<boolean> => {
    if (usesResolver(opts)) return opts.resolveDecision(i as ComponentInteractionFor<TComponentType>);
    if (usesCustomIds(opts)) {
        const { confirmCustomIds, cancelCustomIds = [] } = opts;
        if (confirmCustomIds.includes(i.customId)) return true;
        if (cancelCustomIds.includes(i.customId)) return false;
    }
    return false;
};

/* flow helpers */

const shouldDefer = <TComponentType extends MessageComponentType>(
    ix: Repliables,
    opts: ConfirmableOptions<TComponentType>,
    isSlash: boolean,
    isContext: boolean
): boolean => {
    if (ix.deferred) return false;
    if (opts.defer === false) return false;
    return isSlash || isContext;
};

const maybeDefer = async <TComponentType extends MessageComponentType>(
    ix: Repliables,
    opts: ConfirmableOptions<TComponentType>,
    isSlash: boolean,
    isContext: boolean
): Promise<void> => {
    if (!shouldDefer(ix, opts, isSlash, isContext)) return;

    if (isSlash || isContext) {
        const { ephemeral = true } = opts;
        const flags = ephemeral ? { flags: 'Ephemeral' as const } : undefined;
        if (flags) await ix.deferReply(flags);
        else await ix.deferReply();
    } else if (isMessageComponentIx(ix)) {
        await ix.deferUpdate();
    } else {
        await ix.deferReply().catch(() => undefined);
    }
};

const sendPrompt = async (
    ix: Repliables,
    payload: ConfirmablePayload,
    ephemeral: boolean,
    isSlash: boolean,
    isContext: boolean
): Promise<Message> => {
    if (isSlash || isContext) {
        if (ix.deferred) return ix.editReply(payload as Parameters<typeof ix.editReply>[0]);
        const reply = { ...payload, ...(ephemeral ? { flags: 'Ephemeral' } : {}) } as Parameters<typeof ix.reply>[0];
        await ix.reply(reply);
        return ix.fetchReply();
    }

    const follow = { ...payload, ...(ephemeral ? { flags: 'Ephemeral' } : {}) } as Parameters<typeof ix.followUp>[0];
    return ix.followUp(follow);
};

const awaitComponent = async <TComponentType extends MessageComponentType>(
    msg: Message,
    original: Repliables,
    opts: ConfirmableOptions<TComponentType>
): Promise<{ button: MessageComponentInteraction | null; timedOut: boolean }> => {
    const componentType = opts.componentType ?? ComponentType.Button;
    const timeoutMs = opts.timeoutMs ?? 10_000;

    try {
        const button = await msg.awaitMessageComponent({
            componentType,
            time: timeoutMs,
            filter: (c) => {
                if (c.user.id !== original.user.id) return false;
                if (usesCustomIds(opts)) {
                    const { confirmCustomIds, cancelCustomIds = [] } = opts;
                    return confirmCustomIds.includes(c.customId) || cancelCustomIds.includes(c.customId);
                }
                return true;
            }
        });
        return { button, timedOut: false };
    } catch {
        return { button: null, timedOut: true };
    }
};

const clearUi = async <TComponentType extends MessageComponentType>(
    ix: Repliables,
    msg: Message,
    opts: ConfirmableOptions<TComponentType>,
    isSlash: boolean
): Promise<void> => {
    if (!isSlash) {
        try {
            await msg.edit(clearedPayload(opts) as Parameters<typeof msg.edit>[0]);
        } catch {
            await ix.deleteReply(msg).catch(() => undefined);
        }
        return;
    }
    await ix.editReply(clearedPayload(opts) as Parameters<typeof ix.editReply>[0]).catch(() => undefined);
};

const normalizeClassicOutcome = (payload: MaybeClearedClassic): ClassicPayload => ({
    ...payload,
    components: payload.components ?? []
});

const outcomeReplacement = async <TComponentType extends MessageComponentType>(
    opts: ConfirmableOptions<TComponentType>,
    ctx: ConfirmableContext,
    confirmed: boolean,
    timedOut: boolean
): Promise<ConfirmablePayload | null> => {
    const outcomes = opts.outcomeUi;

    if (isV2(opts)) {
        const v2Outcomes = outcomes as OutcomeUiV2;
        if (timedOut) return await resolveFactory(v2Outcomes.onTimeout, ctx);
        if (!confirmed) return await resolveFactory(v2Outcomes.onCancel, ctx);
        if (v2Outcomes.onConfirm) return await resolveFactory(v2Outcomes.onConfirm, ctx);
        return null;
    }

    const classicOutcomes = outcomes as OutcomeUiClassic;
    if (timedOut) return normalizeClassicOutcome(await resolveFactory(classicOutcomes.onTimeout, ctx));
    if (!confirmed) return normalizeClassicOutcome(await resolveFactory(classicOutcomes.onCancel, ctx));
    if (classicOutcomes.onConfirm) {
        return normalizeClassicOutcome(await resolveFactory(classicOutcomes.onConfirm, ctx));
    }
    return null;
};

/* decorator */

/**
 * Wraps a repliable handler method with an interactive confirmation flow.
 *
 * Displays a prompt, waits for a follow-up component interaction, and conditionally executes the original method
 * based on the user's decision. The decorator supports both classic action rows + embed/content and ComponentV2 containers.
 *
 * @typeParam TComp - Message component type that should resolve the confirmation.
 * @param question - Static string or lazy factory that resolves the prompt question.
 * @param options - Confirmation flow configuration.
 * @decorator
 */
export function Confirmable<TComponent extends MessageComponentType = ComponentType.Button>(
    question: QuestionInput,
    options: ConfirmableOptions<TComponent>
) {
    type HandlerMethod = (...args: unknown[]) => Promise<void>;

    return function (
        _target: RepliableInteractionHandler,
        _propertyKey: string,
        descriptor: TypedPropertyDescriptor<HandlerMethod>
    ): TypedPropertyDescriptor<HandlerMethod> {
        const original = descriptor.value;

        descriptor.value = async function (this: RepliableInteractionHandler, ...args: unknown[]): Promise<void> {
            if (!original) throw new SeedcordError(SeedcordErrorCode.DecoratorMethodNotFound);

            const ix = this.getEvent();
            const isSlash = ix.isChatInputCommand();
            const isContext = ix.isContextMenuCommand();
            const { ephemeral = true } = options;

            await maybeDefer(ix, options, isSlash, isContext);

            const q = typeof question === 'function' ? await question.apply(this) : question;

            const ctx: ConfirmableContext = { handler: this, interaction: ix, question: q };

            const prompt = await buildPrompt(options, ctx);

            const promptMsg = await sendPrompt(ix, prompt, ephemeral, isSlash, isContext);

            const { button, timedOut } = await awaitComponent(promptMsg, ix, options);

            let confirmed = false;
            if (button) {
                await button.deferUpdate().catch(() => undefined);
                confirmed = await decide(options, button);
            }

            const replacement = await outcomeReplacement(options, ctx, confirmed, timedOut);

            if (replacement) {
                if (isSlash || isContext) {
                    await ix.editReply(replacement as Parameters<typeof ix.editReply>[0]).catch(() => undefined);
                } else {
                    await promptMsg.edit(replacement as Parameters<typeof promptMsg.edit>[0]).catch(async () => {
                        await ix.deleteReply(promptMsg).catch(() => undefined);
                        await ix.followUp(replacement as Parameters<typeof ix.followUp>[0]).catch(() => undefined);
                    });
                }
            } else {
                await clearUi(ix, promptMsg, options, isSlash);
            }

            if (options.onResolved) {
                await options.onResolved({
                    confirmed,
                    timedOut,
                    handler: this,
                    interaction: ix,
                    question: q,
                    ...(button ? { button } : {})
                });
            }

            if (confirmed) {
                await original.apply(this, args);
            }
        };

        return descriptor;
    };
}
