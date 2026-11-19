import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { checkAckLegality } from './ackLegality';
import { AckTrace } from './AckTrace';
import { deferFlags, sendFlags } from './flags';
import { messageBody } from './responseReport';
import { serializeModal, serializeReply } from './serializeReply';
import { WriteAttempt } from './WriteAttempt';

import type { AckState, ReplyMethod } from './ackLegality';
import type { MessageMethod, ReplyTelemetry, SentFile, SentWrite } from './responseReport';
import type { SerializedReply } from './serializeReply';
import type { DeferOpts, ReplyFile, ReplyResponse, SendOpts } from '@seedcord/types';
import type { APIModalInteractionResponseCallbackData } from 'discord-api-types/v10';
import type { ExtractStrict } from 'type-fest';

/** The shape djs modal builders emit from `toJSON()`. */
export interface ModalLike {
    toJSON(): APIModalInteractionResponseCallbackData;
}

interface PreparedMessage<TNative> {
    readonly reply: SerializedReply<TNative>;
    readonly sent: ExtractStrict<SentWrite, { method: MessageMethod }>;
}

/**
 * Tracks acknowledgement state. Every verb runs the legality check, calls the transport's wire writer,
 * then updates the state and the ack trace. Each transport binds `TMessage` to its own created-message
 * type and supplies the writers.
 *
 * @throws A **SeedcordError** when you call a verb the current ack state doesn't allow. It throws before any transport call.
 */
export abstract class BaseReplySender<TMessage extends { id: string }, TNative = never> {
    private state: AckState;
    // the only ids a targeted edit accepts
    private readonly sent = new Set<string>();
    // the cause holds the first ack's stack so a double-ack reports both lines
    private ackedBy?: AckTrace;

    protected constructor(
        private readonly telemetry: ReplyTelemetry,
        private isEphemeralByDefault: boolean, // defer() overwrites it with its own visibility
        initialState: AckState = 'unacked'
    ) {
        this.state = initialState;
    }

    protected get routeId(): string {
        return this.telemetry.dispatch.routeId;
    }

    // inside the attempt so the report covers a builder's throw too
    private async prepare(
        method: MessageMethod,
        write: WriteAttempt,
        response: ReplyResponse<TNative> | string
    ): Promise<PreparedMessage<TNative>> {
        return await write.run({ method, body: null }, () => {
            const reply = serializeReply(response, this.routeId);
            return {
                reply,
                sent: { method, body: messageBody(reply, (file) => this.describeFile(file)) }
            };
        });
    }

    public async reply(response: ReplyResponse<TNative> | string, opts?: SendOpts): Promise<TMessage> {
        this.checkLegality('reply');
        const write = new WriteAttempt(this.telemetry);
        const { reply, sent } = await this.prepare('reply', write, response);
        const created = await write.run(sent, () => this.writeReply(reply, this.replyFlags(opts)));
        // record replied before the message guard can throw because the callback has already acked discord
        this.transition('reply', 'replied');
        const message = this.remember(this.requireMessage(created, 'reply'));
        write.sent(sent, message.id);
        return message;
    }

    public async defer(opts?: DeferOpts): Promise<void> {
        this.checkLegality('defer');
        const write = new WriteAttempt(this.telemetry);
        const ephemeral = this.ephemeral(opts);
        const sent = { method: 'defer', body: null } as const;
        await write.run(sent, () => this.writeDefer(deferFlags(ephemeral)));
        this.isEphemeralByDefault = ephemeral;
        this.transition('defer', 'deferred-reply');
        write.sent(sent, null);
    }

    public async deferUpdate(): Promise<void> {
        this.checkLegality('deferUpdate');
        const write = new WriteAttempt(this.telemetry);
        const sent = { method: 'deferUpdate', body: null } as const;
        await write.run(sent, () => this.writeDeferUpdate());
        this.transition('deferUpdate', 'deferred-update');
        write.sent(sent, null);
    }

    /**
     * After a deferUpdate the state is still deferred-update. Calling this again rewrites. The returned message
     * is the source message, editable only through a bare `update` or `edit`. A targeted `edit` or `delete`
     * of it throws the foreign-target error.
     */
    public async update(response: ReplyResponse<TNative> | string): Promise<TMessage> {
        this.checkLegality('update');
        const write = new WriteAttempt(this.telemetry);
        const { reply, sent } = await this.prepare('update', write, response);
        // in deferred-update the source message is @original and the ack-legality check above has already passed
        if (this.state === 'deferred-update') {
            const edited = await write.run(sent, () => this.editOriginal(reply));
            write.sent(sent, edited.id);
            return edited;
        }
        const created = await write.run(sent, () => this.writeUpdate(reply));
        this.transition('update', 'replied');
        const message = this.remember(this.requireMessage(created, 'update'));
        write.sent(sent, message.id);
        return message;
    }

    public async followUp(response: ReplyResponse<TNative> | string, opts?: SendOpts): Promise<TMessage> {
        this.checkLegality('followUp');
        if (this.state === 'deferred-reply') {
            // discord edits the loading message for a followUp here anyway and ignores its ephemeral flag
            if (this.ephemeral(opts) === this.isEphemeralByDefault) return await this.edit(response);
            await this.delete();
        }
        const write = new WriteAttempt(this.telemetry);
        const { reply, sent } = await this.prepare('followUp', write, response);
        const created = await write.run(sent, () => this.writeFollowUp(reply, this.replyFlags(opts)));
        const message = this.remember(created);
        write.sent(sent, message.id);
        return message;
    }

    public edit(response: ReplyResponse<TNative> | string): Promise<TMessage>;
    public edit(target: TMessage, response: ReplyResponse<TNative> | string): Promise<TMessage>;
    public async edit(
        targetOrResponse: TMessage | ReplyResponse<TNative> | string,
        maybeResponse?: ReplyResponse<TNative> | string
    ): Promise<TMessage> {
        this.checkLegality('edit');
        const write = new WriteAttempt(this.telemetry);
        if (maybeResponse === undefined) {
            // justified: the overloads narrow targetOrResponse to a response once maybeResponse is absent
            const response = targetOrResponse as ReplyResponse<TNative> | string;
            const { reply, sent } = await this.prepare('edit', write, response);
            const edited = await write.run(sent, () => this.editOriginal(reply));
            write.sent(sent, edited.id);
            return edited;
        }
        // justified: the overloads narrow targetOrResponse to a target message once maybeResponse is defined
        const target = targetOrResponse as TMessage;
        if (!this.sent.has(target.id)) {
            throw new SeedcordError(SeedcordErrorCode.ReplyForeignEditTarget, ['edit', target.id, this.routeId]);
        }
        const { reply, sent } = await this.prepare('edit', write, maybeResponse);
        const written = await write.run(sent, () => this.writeEditTarget(target.id, reply));
        const message = this.remember(written);
        write.sent(sent, message.id);
        return message;
    }

    public delete(): Promise<void>;
    public delete(target: TMessage): Promise<void>;
    public async delete(target?: TMessage): Promise<void> {
        this.checkLegality('delete');
        const write = new WriteAttempt(this.telemetry);
        const sent = { method: 'delete', body: null } as const;
        if (target === undefined) {
            await write.run(sent, () => this.writeDeleteOriginal());
            this.settleDefer();
            write.sent(sent, null);
            return;
        }
        if (!this.sent.has(target.id)) {
            throw new SeedcordError(SeedcordErrorCode.ReplyForeignEditTarget, ['delete', target.id, this.routeId]);
        }
        await write.run(sent, () => this.writeDeleteTarget(target.id));
        // evict so a later targeted edit of this id throws foreign
        this.sent.delete(target.id);
        write.sent(sent, null);
    }

    /** Calls {@link reply} if nothing went out yet and {@link followUp} after that. */
    public async send(response: ReplyResponse<TNative> | string, opts?: SendOpts): Promise<TMessage> {
        if (this.state === 'unacked') return await this.reply(response, opts);
        return await this.followUp(response, opts);
    }

    /** Must be the initial response. */
    public async showModal(modal: ModalLike): Promise<void> {
        this.checkLegality('showModal');
        this.guardModalSource();
        const write = new WriteAttempt(this.telemetry);
        const data = await write.run({ method: 'showModal', body: null }, () => serializeModal(modal, this.routeId));
        const sent = { method: 'showModal', body: data } as const;
        await write.run(sent, () => this.writeModal(data));
        this.transition('showModal', 'replied');
        write.sent(sent, null);
    }

    protected remember(created: TMessage): TMessage {
        this.sent.add(created.id);
        return created;
    }

    // a with_response callback always returns the created message. this only trips if the wire response differs
    private requireMessage(created: TMessage | undefined, method: 'reply' | 'update'): TMessage {
        if (!created) throw new SeedcordError(SeedcordErrorCode.ReplyCallbackMissingMessage, [method, this.routeId]);
        return created;
    }

    private async editOriginal(reply: SerializedReply<TNative>): Promise<TMessage> {
        const edited = await this.writeEditOriginal(reply);
        // after a deferUpdate the source message is @original, which this interaction did not send
        if (this.state !== 'deferred-update') this.remember(edited);
        this.settleDefer();
        return edited;
    }

    // once the loading message is filled or deleted, a send makes a new message the same way it does after a reply
    private settleDefer(): void {
        if (this.state === 'deferred-reply') this.state = 'replied';
    }

    private ephemeral(opts: SendOpts | DeferOpts | undefined): boolean {
        return opts?.ephemeral ?? this.isEphemeralByDefault;
    }

    private replyFlags(opts: SendOpts | undefined): number {
        return sendFlags({ ...opts, ephemeral: this.ephemeral(opts) });
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

    protected abstract writeReply(reply: SerializedReply<TNative>, flags: number): Promise<TMessage | undefined>;
    protected abstract writeDefer(flags: number): Promise<void>;
    protected abstract writeDeferUpdate(): Promise<void>;
    protected abstract writeUpdate(reply: SerializedReply<TNative>): Promise<TMessage | undefined>;
    protected abstract writeFollowUp(reply: SerializedReply<TNative>, flags: number): Promise<TMessage>;
    protected abstract writeEditOriginal(reply: SerializedReply<TNative>): Promise<TMessage>;
    protected abstract writeEditTarget(targetId: string, reply: SerializedReply<TNative>): Promise<TMessage>;
    protected abstract writeDeleteOriginal(): Promise<void>;
    protected abstract writeDeleteTarget(targetId: string): Promise<void>;
    protected abstract writeModal(data: APIModalInteractionResponseCallbackData): Promise<void>;
    // returns the name, alt text, and title that the transport's client uploads the file with
    protected abstract describeFile(file: ReplyFile | TNative): SentFile;
}
