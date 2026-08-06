import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { checkAckLegality, sendTarget } from './ackLegality';
import { AckTrace } from './AckTrace';
import { attemptWrite, publishResponse } from './responseReport';
import { serializeReply } from './serializeReply';
import { translateSerializationError } from './translateSerialization';

import type { AckState, ReplyMethod } from './ackLegality';
import type { ReplyTelemetry } from './responseReport';
import type { SerializedReply } from './serializeReply';
import type { DeferOpts, ReplyResponse, SendOpts } from '@seedcord/types';
import type { ResponseOutcome } from '@subscribers/types/Subscriptions';
import type { APIModalInteractionResponseCallbackData } from 'discord-api-types/v10';

/** The shape djs modal builders emit from `toJSON()`. */
export interface ModalLike {
    toJSON(): APIModalInteractionResponseCallbackData;
}

/**
 * Tracks acknowledgement state and throws a translated `SeedcordError` on an illegal verb before any
 * transport call. Verbs execute the legality check, control the transport wire writer, then update the
 * state and ack trace. Each transport binds `TMessage` to its created-message lens and supplies the
 * writers.
 */
export abstract class BaseReplySender<TMessage extends { id: string }, TNative = never> {
    private state: AckState;
    // the only ids a targeted edit accepts
    private readonly sent = new Set<string>();
    // the cause carries the first ack's stack so a double-ack reports both lines
    private ackedBy?: AckTrace;

    protected constructor(
        protected readonly routeId: string,
        private readonly telemetry: ReplyTelemetry,
        initialState: AckState = 'unacked'
    ) {
        this.state = initialState;
    }

    private report(method: ReplyMethod, startedAt: number, outcome: ResponseOutcome, messageId: string | null): void {
        publishResponse(this.telemetry, { routeId: this.routeId, method, startedAt, outcome, messageId });
    }

    private async attempt<Result>(
        method: ReplyMethod,
        startedAt: number,
        write: () => Promise<Result>
    ): Promise<Result> {
        return await attemptWrite(this.telemetry, this.routeId, method, startedAt, write);
    }

    public async reply(response: ReplyResponse<TNative> | string, opts?: SendOpts): Promise<TMessage> {
        this.checkLegality('reply');
        const startedAt = performance.now();
        const created = await this.attempt('reply', startedAt, () => this.writeReply(response, opts));
        // the callback already acked discord, so record replied before the message guard can throw
        this.transition('reply', 'replied');
        const message = this.remember(this.requireMessage(created, 'reply'));
        this.report('reply', startedAt, 'sent', message.id);
        return message;
    }

    public async defer(opts?: DeferOpts): Promise<void> {
        this.checkLegality('defer');
        const startedAt = performance.now();
        await this.attempt('defer', startedAt, () => this.writeDefer(opts));
        this.transition('defer', 'deferred-reply');
        this.report('defer', startedAt, 'sent', null);
    }

    public async deferUpdate(): Promise<void> {
        this.checkLegality('deferUpdate');
        const startedAt = performance.now();
        await this.attempt('deferUpdate', startedAt, () => this.writeDeferUpdate());
        this.transition('deferUpdate', 'deferred-update');
        this.report('deferUpdate', startedAt, 'sent', null);
    }

    /**
     * After a deferUpdate the state stays deferred-update, so the rewrite repeats. The returned message
     * is the source message, editable only through a bare `update` or `edit`. A targeted `edit` or `delete`
     * of it throws the foreign-target error.
     */
    public async update(response: ReplyResponse<TNative> | string): Promise<TMessage> {
        this.checkLegality('update');
        const startedAt = performance.now();
        // in deferred-update the source message is @original and the ack-legality check above already passed
        if (this.state === 'deferred-update') {
            const edited = await this.attempt('update', startedAt, () => this.editOriginal(response));
            this.report('update', startedAt, 'sent', edited.id);
            return edited;
        }
        const created = await this.attempt('update', startedAt, () => this.writeUpdate(response));
        this.transition('update', 'replied');
        const message = this.remember(this.requireMessage(created, 'update'));
        this.report('update', startedAt, 'sent', message.id);
        return message;
    }

    public async followUp(response: ReplyResponse<TNative> | string, opts?: SendOpts): Promise<TMessage> {
        this.checkLegality('followUp');
        const startedAt = performance.now();
        const created = await this.attempt('followUp', startedAt, () => this.writeFollowUp(response, opts));
        const message = this.remember(created);
        this.report('followUp', startedAt, 'sent', message.id);
        return message;
    }

    public edit(response: ReplyResponse<TNative> | string): Promise<TMessage>;
    public edit(target: TMessage, response: ReplyResponse<TNative> | string): Promise<TMessage>;
    public async edit(
        targetOrResponse: TMessage | ReplyResponse<TNative> | string,
        maybeResponse?: ReplyResponse<TNative> | string
    ): Promise<TMessage> {
        this.checkLegality('edit');
        const startedAt = performance.now();
        if (maybeResponse === undefined) {
            // justified: the overloads narrow targetOrResponse to a response once maybeResponse is absent
            const edited = await this.attempt('edit', startedAt, () =>
                this.editOriginal(targetOrResponse as ReplyResponse<TNative> | string)
            );
            this.report('edit', startedAt, 'sent', edited.id);
            return edited;
        }
        // justified: the overloads narrow targetOrResponse to a target message once maybeResponse is defined
        const target = targetOrResponse as TMessage;
        if (!this.sent.has(target.id)) {
            throw new SeedcordError(SeedcordErrorCode.ReplyForeignEditTarget, ['edit', target.id, this.routeId]);
        }
        const written = await this.attempt('edit', startedAt, () => this.writeEditTarget(target.id, maybeResponse));
        const message = this.remember(written);
        this.report('edit', startedAt, 'sent', message.id);
        return message;
    }

    public delete(): Promise<void>;
    public delete(target: TMessage): Promise<void>;
    public async delete(target?: TMessage): Promise<void> {
        this.checkLegality('delete');
        const startedAt = performance.now();
        if (target === undefined) {
            await this.attempt('delete', startedAt, () => this.writeDeleteOriginal());
            this.report('delete', startedAt, 'sent', null);
            return;
        }
        if (!this.sent.has(target.id)) {
            throw new SeedcordError(SeedcordErrorCode.ReplyForeignEditTarget, ['delete', target.id, this.routeId]);
        }
        await this.attempt('delete', startedAt, () => this.writeDeleteTarget(target.id));
        // evict so a later targeted edit of this id throws foreign
        this.sent.delete(target.id);
        this.report('delete', startedAt, 'sent', null);
    }

    /** Routes to the verb the current ack state permits. Every state has a route, so the illegal-ack throw is unreachable. */
    public async send(response: ReplyResponse<TNative> | string, opts?: SendOpts): Promise<TMessage> {
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
        const startedAt = performance.now();
        await this.attempt('showModal', startedAt, () => this.writeModal(data));
        this.transition('showModal', 'replied');
        this.report('showModal', startedAt, 'sent', null);
    }

    protected serialize(response: ReplyResponse<TNative> | string): SerializedReply<TNative> {
        return serializeReply(response, this.routeId);
    }

    protected remember(created: TMessage): TMessage {
        this.sent.add(created.id);
        return created;
    }

    // a with_response callback always returns the created message, so this guards a wire-contract gap
    private requireMessage(created: TMessage | undefined, method: 'reply' | 'update'): TMessage {
        if (!created) throw new SeedcordError(SeedcordErrorCode.ReplyCallbackMissingMessage, [method, this.routeId]);
        return created;
    }

    private async editOriginal(response: ReplyResponse<TNative> | string): Promise<TMessage> {
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

    // gateway overrides this to reject a modal-submit source
    protected guardModalSource(): void {}

    protected abstract writeReply(
        response: ReplyResponse<TNative> | string,
        opts?: SendOpts
    ): Promise<TMessage | undefined>;
    protected abstract writeDefer(opts?: DeferOpts): Promise<void>;
    protected abstract writeDeferUpdate(): Promise<void>;
    protected abstract writeUpdate(response: ReplyResponse<TNative> | string): Promise<TMessage | undefined>;
    protected abstract writeFollowUp(response: ReplyResponse<TNative> | string, opts?: SendOpts): Promise<TMessage>;
    protected abstract writeEditOriginal(response: ReplyResponse<TNative> | string): Promise<TMessage>;
    protected abstract writeEditTarget(targetId: string, response: ReplyResponse<TNative> | string): Promise<TMessage>;
    protected abstract writeDeleteOriginal(): Promise<void>;
    protected abstract writeDeleteTarget(targetId: string): Promise<void>;
    protected abstract writeModal(data: APIModalInteractionResponseCallbackData): Promise<void>;
}
