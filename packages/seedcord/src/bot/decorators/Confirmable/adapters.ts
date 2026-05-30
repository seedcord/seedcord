import { resolveFactory } from './utils';

import type {
    ConfirmableClassicOptions,
    ConfirmableComponentsV2Options,
    ConfirmableContext,
    ConfirmableOptions,
    ConfirmablePayload,
    ClassicPayload,
    MaybeClearedClassic,
    RowLike
} from './types';
import type { MessageComponentType } from 'discord.js';
import type { NonEmptyTuple } from 'type-fest';

export interface ConfirmableAdapter {
    buildPrompt(ctx: ConfirmableContext): Promise<ConfirmablePayload>;
    clearedPayload(): ConfirmablePayload;
    getReplacement(ctx: ConfirmableContext, confirmed: boolean, timedOut: boolean): Promise<ConfirmablePayload | null>;
}

export class ClassicAdapter<TComponentType extends MessageComponentType> implements ConfirmableAdapter {
    constructor(private readonly opts: ConfirmableClassicOptions<TComponentType>) {}

    public async buildPrompt(ctx: ConfirmableContext): Promise<ConfirmablePayload> {
        const [prompt, rows] = await Promise.all([
            resolveFactory(this.opts.prompt, ctx),
            resolveFactory(this.opts.rows, ctx)
        ]);
        const components = [...rows] as NonEmptyTuple<RowLike>;

        const payload: ClassicPayload = { components };

        if (typeof prompt === 'string') payload.content = prompt;
        else payload.embeds = [prompt.component];

        return payload;
    }

    public clearedPayload(): ConfirmablePayload {
        return { components: [] as readonly RowLike[] };
    }

    public async getReplacement(
        ctx: ConfirmableContext,
        confirmed: boolean,
        timedOut: boolean
    ): Promise<ConfirmablePayload | null> {
        const outcomes = this.opts.outcomeUi;
        if (!outcomes) return null;

        const normalize = (payload: MaybeClearedClassic): ClassicPayload => ({
            ...payload,
            components: payload.components ?? []
        });

        if (timedOut) return normalize(await resolveFactory(outcomes.onTimeout, ctx));
        if (!confirmed) return normalize(await resolveFactory(outcomes.onCancel, ctx));
        if (outcomes.onConfirm) {
            return normalize(await resolveFactory(outcomes.onConfirm, ctx));
        }
        return null;
    }
}

export class V2Adapter<TComponentType extends MessageComponentType> implements ConfirmableAdapter {
    constructor(private readonly opts: ConfirmableComponentsV2Options<TComponentType>) {}

    public async buildPrompt(ctx: ConfirmableContext): Promise<ConfirmablePayload> {
        const container = await resolveFactory(this.opts.container, ctx);
        return { flags: 'IsComponentsV2', components: [container.component] };
    }

    public clearedPayload(): ConfirmablePayload {
        return { flags: 'IsComponentsV2', components: [] };
    }

    public async getReplacement(
        ctx: ConfirmableContext,
        confirmed: boolean,
        timedOut: boolean
    ): Promise<ConfirmablePayload | null> {
        const outcomes = this.opts.outcomeUi;
        if (!outcomes) return null;

        if (timedOut) return await resolveFactory(outcomes.onTimeout, ctx);
        if (!confirmed) return await resolveFactory(outcomes.onCancel, ctx);
        if (outcomes.onConfirm) return await resolveFactory(outcomes.onConfirm, ctx);
        return null;
    }
}

export function createAdapter<TComponentType extends MessageComponentType>(
    opts: ConfirmableOptions<TComponentType>
): ConfirmableAdapter {
    if (opts.mode === 'v2') return new V2Adapter(opts);
    return new ClassicAdapter(opts);
}
