import { ReplySender } from '@bot/ReplySender';

import { BaseHandler } from './BaseHandler';

import type { Repliables } from './BaseHandler';
import type { SentMessage } from '@bot/ReplySender';
import type { Core } from '@interfaces/Core';
import type { DispatchContext } from '@seedcord/core';
import type { DeferOpts, ReplyResponse, SendOpts } from '@seedcord/types';

/**
 * Shared base the repliable interaction handlers extend.
 *
 * Not a public entry point. Extend {@link SlashHandler}, {@link ButtonHandler}, {@link ModalHandler},
 * {@link SelectMenuHandler}, or {@link ContextMenuHandler} instead. This class defines the reply members
 * those bases share.
 *
 * @typeParam Event - The repliable interaction type this handler processes
 */
export abstract class RepliableHandler<Event extends Repliables> extends BaseHandler<Event> {
    protected readonly sender: ReplySender;
    protected readonly routeId: string;

    protected constructor(event: Event, core: Core, dispatch?: DispatchContext) {
        super(event, core, dispatch);
        this.routeId = dispatch?.routeId ?? this.constructor.name;
        this.sender = new ReplySender(event, this.routeId);
    }

    /** @internal The dispatcher's fault boundary replies through the live ack state. */
    public getSender(): ReplySender {
        return this.sender;
    }

    /** Send the initial response, exactly once. */
    protected reply(response: ReplyResponse | string, opts?: SendOpts): Promise<SentMessage> {
        return this.sender.reply(response, opts);
    }

    /** Show a "thinking" placeholder, then fill it later with {@link edit}. */
    protected defer(opts?: DeferOpts): Promise<void> {
        return this.sender.defer(opts);
    }

    /** Send a new message once the interaction is acknowledged. */
    protected followUp(response: ReplyResponse | string, opts?: SendOpts): Promise<SentMessage> {
        return this.sender.followUp(response, opts);
    }

    /** Rewrite the initial reply or deferred placeholder. The targeted form rewrites a message a prior send returned. */
    protected edit(response: ReplyResponse | string): Promise<SentMessage>;
    protected edit(target: SentMessage, response: ReplyResponse | string): Promise<SentMessage>;
    protected edit(
        targetOrResponse: SentMessage | ReplyResponse | string,
        maybeResponse?: ReplyResponse | string
    ): Promise<SentMessage> {
        if (maybeResponse === undefined) return this.sender.edit(targetOrResponse);
        return this.sender.edit(targetOrResponse as SentMessage, maybeResponse);
    }

    /** Make the user see this regardless of the current ack state. */
    protected send(response: ReplyResponse | string, opts?: SendOpts): Promise<SentMessage> {
        return this.sender.send(response, opts);
    }
}
