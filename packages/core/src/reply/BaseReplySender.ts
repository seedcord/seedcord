import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { checkAckLegality, sendTarget } from './ackLegality';
import { AckTrace } from './AckTrace';
import { serializeReply } from './serializeReply';
import { translateSerializationError } from './translateSerialization';

import type { AckState, ReplyMethod } from './ackLegality';
import type { SerializedReply } from './serializeReply';
import type { DeferOpts, ReplyResponse, SendOpts } from '@seedcord/types';
import type { APIModalInteractionResponseCallbackData } from 'discord-api-types/v10';

/** The shape djs modal builders emit from `toJSON()`. */
export interface ModalLike {
    toJSON(): APIModalInteractionResponseCallbackData;
}

/**
 * Manages acknowledgement state to ensure illegal verbs throw a translated `SeedcordError` before any
 * transport call. Verbs execute the legality check, control the transport wire writer, then update the
 * state and ack trace. Each transport binds `TMessage` to its created-message lens and supplies the
 * writers.
 */
export abstract class BaseReplySender<TMessage extends { id: string }> {
    private state: AckState;
    // the only ids a targeted edit accepts
    private readonly sent = new Set<string>();
    // the cause carries the first ack's stack so a double-ack names both lines
    private ackedBy?: AckTrace;

    protected constructor(
        protected readonly routeId: string,
        initialState: AckState = 'unacked'
    ) {
        this.state = initialState;
    }

    public async reply(response: ReplyResponse | string, opts?: SendOpts): Promise<TMessage> {
        this.checkLegality('reply');
        const created = await this.writeReply(response, opts);
        this.transition('reply', 'replied');
        return this.remember(created);
    }

    public async defer(opts?: DeferOpts): Promise<void> {
        this.checkLegality('defer');
        await this.writeDefer(opts);
        this.transition('defer', 'deferred-reply');
    }

    public async deferUpdate(): Promise<void> {
        this.checkLegality('deferUpdate');
        await this.writeDeferUpdate();
        this.transition('deferUpdate', 'deferred-update');
    }

    /** After a deferUpdate the state stays deferred-update, so the rewrite repeats. */
    public async update(response: ReplyResponse | string): Promise<TMessage> {
        this.checkLegality('update');
        // in deferred-update the source message is @original and the ack-legality check above already passed
        if (this.state === 'deferred-update') return await this.editOriginal(response);
        const created = await this.writeUpdate(response);
        this.transition('update', 'replied');
        return this.remember(created);
    }

    public async followUp(response: ReplyResponse | string, opts?: SendOpts): Promise<TMessage> {
        this.checkLegality('followUp');
        const created = await this.writeFollowUp(response, opts);
        return this.remember(created);
    }

    public edit(response: ReplyResponse | string): Promise<TMessage>;
    public edit(target: TMessage, response: ReplyResponse | string): Promise<TMessage>;
    public async edit(
        targetOrResponse: TMessage | ReplyResponse | string,
        maybeResponse?: ReplyResponse | string
    ): Promise<TMessage> {
        this.checkLegality('edit');
        if (maybeResponse === undefined) {
            // justified: the overloads narrow targetOrResponse to a response once maybeResponse is absent
            return await this.editOriginal(targetOrResponse as ReplyResponse | string);
        }
        // justified: the overloads narrow targetOrResponse to a target message once maybeResponse is defined
        const target = targetOrResponse as TMessage;
        if (!this.sent.has(target.id)) {
            throw new SeedcordError(SeedcordErrorCode.ReplyForeignEditTarget, [target.id, this.routeId]);
        }
        return this.remember(await this.writeEditTarget(target.id, maybeResponse));
    }

    /** Routes to the verb the current ack state permits. Every state has a route, so the illegal-ack throw is unreachable. */
    public async send(response: ReplyResponse | string, opts?: SendOpts): Promise<TMessage> {
        const target = sendTarget(this.state);
        if (target === 'reply') return await this.reply(response, opts);
        if (target === 'edit') return await this.edit(response);
        return await this.followUp(response, opts);
    }

    /** Must be the initial response. */
    public async showModal(modal: ModalLike): Promise<void> {
        this.checkLegality('showModal');
        this.guardModalSource();
        let data: APIModalInteractionResponseCallbackData;
        try {
            data = modal.toJSON();
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- a null-prototype modal has no constructor at runtime
            const name = modal.constructor?.name;
            throw translateSerializationError(error, !name || name === 'Object' ? 'modal' : name, 0, this.routeId);
        }
        await this.writeModal(data);
        this.transition('showModal', 'replied');
    }

    protected serialize(response: ReplyResponse | string): SerializedReply {
        return serializeReply(response, this.routeId);
    }

    protected remember(created: TMessage): TMessage {
        this.sent.add(created.id);
        return created;
    }

    private async editOriginal(response: ReplyResponse | string): Promise<TMessage> {
        const edited = await this.writeEditOriginal(response);
        // after a deferUpdate the source message is @original, which this interaction did not send
        if (this.state !== 'deferred-update') this.remember(edited);
        return edited;
    }

    private checkLegality(method: ReplyMethod): void {
        checkAckLegality(method, this.state, this.routeId, this.ackedBy);
    }

    private transition(method: ReplyMethod, state: AckState): void {
        this.state = state;
        this.ackedBy = new AckTrace(method);
    }

    // the modal-submit backstop, gateway overrides, the base call is a no-op elsewhere
    protected guardModalSource(): void {}

    protected abstract writeReply(response: ReplyResponse | string, opts?: SendOpts): Promise<TMessage>;
    protected abstract writeDefer(opts?: DeferOpts): Promise<void>;
    protected abstract writeDeferUpdate(): Promise<void>;
    protected abstract writeUpdate(response: ReplyResponse | string): Promise<TMessage>;
    protected abstract writeFollowUp(response: ReplyResponse | string, opts?: SendOpts): Promise<TMessage>;
    protected abstract writeEditOriginal(response: ReplyResponse | string): Promise<TMessage>;
    protected abstract writeEditTarget(targetId: string, response: ReplyResponse | string): Promise<TMessage>;
    protected abstract writeModal(data: APIModalInteractionResponseCallbackData): Promise<void>;
}
