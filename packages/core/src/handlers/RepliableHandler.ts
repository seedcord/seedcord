import { BaseHandler } from './BaseHandler';

import type { CoreBase } from '@interfaces/CoreBase';
import type { BaseReplySender } from '@reply/BaseReplySender';
import type { DeferOpts, ReplyResponse, SendOpts } from '@seedcord/types';
import type { DispatchContext } from '@src/dispatch/DispatchContext';

/**
 * Shared base the repliable handlers on both transports extend. Defines the reply members over the sender
 * the transport builds.
 *
 * @typeParam Event - The repliable interaction type this handler processes
 * @typeParam TCore - The transport's Core
 * @typeParam TMessage - The transport's created-message lens
 * @typeParam TSender - The transport's reply sender
 */
export abstract class RepliableHandler<
    Event,
    TCore extends CoreBase,
    TMessage extends { id: string },
    TSender extends BaseReplySender<TMessage>
> extends BaseHandler<Event, TCore> {
    protected readonly sender: TSender;
    protected readonly routeId: string;

    protected constructor(event: Event, core: TCore, dispatch?: DispatchContext) {
        super(event, core, dispatch);
        this.routeId = dispatch?.routeId ?? this.constructor.name;
        // runs inside the ctor, an override builds from its arguments only, subclass fields are not initialized yet
        this.sender = this.buildSender(event, core, this.routeId);
    }

    protected abstract buildSender(event: Event, core: TCore, routeId: string): TSender;

    /** @internal The dispatcher's fault boundary replies through the live ack state. */
    public getSender(): TSender {
        return this.sender;
    }

    /** Send the initial response, exactly once. */
    protected reply(response: ReplyResponse | string, opts?: SendOpts): Promise<TMessage> {
        return this.sender.reply(response, opts);
    }

    /** Show a "thinking" placeholder, then fill it later with {@link edit}. */
    protected defer(opts?: DeferOpts): Promise<void> {
        return this.sender.defer(opts);
    }

    /** Send a new message once the interaction is acknowledged. */
    protected followUp(response: ReplyResponse | string, opts?: SendOpts): Promise<TMessage> {
        return this.sender.followUp(response, opts);
    }

    /** Rewrite the initial reply or deferred placeholder. The targeted form rewrites a message a prior send returned. */
    protected edit(response: ReplyResponse | string): Promise<TMessage>;
    protected edit(target: TMessage, response: ReplyResponse | string): Promise<TMessage>;
    protected edit(
        targetOrResponse: TMessage | ReplyResponse | string,
        maybeResponse?: ReplyResponse | string
    ): Promise<TMessage> {
        // justified: the overloads narrow targetOrResponse to a response once maybeResponse is absent
        if (maybeResponse === undefined) return this.sender.edit(targetOrResponse as ReplyResponse | string);
        // justified: the overloads narrow targetOrResponse to a target message once maybeResponse is defined
        return this.sender.edit(targetOrResponse as TMessage, maybeResponse);
    }

    /** Routes to reply, followUp, or edit based on the current ack state. */
    protected send(response: ReplyResponse | string, opts?: SendOpts): Promise<TMessage> {
        return this.sender.send(response, opts);
    }

    /** Delete the initial reply or deferred placeholder. Pass a target to delete a message a prior send returned. */
    protected delete(target?: TMessage): Promise<void> {
        return target === undefined ? this.sender.delete() : this.sender.delete(target);
    }
}
