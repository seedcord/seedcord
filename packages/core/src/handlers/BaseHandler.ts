import { Logger } from '@seedcord/logger';

import { MemberValues } from '#src/dispatch/DispatchContext';

import type { CoreBase } from '#interfaces/CoreBase';
import type { DispatchContext } from '#src/dispatch/DispatchContext';
import type { DispatchMemberValues, LoggerChannelId } from '@seedcord/types';
import type { Promisable } from 'type-fest';

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- the class below merges with this to get the members
export interface BaseHandler<Event, TCore extends CoreBase> extends DispatchMemberValues {}

/**
 * Base class every transport handler extends. Don't register handlers directly. Use the more specific
 * handler subclasses.
 *
 * @typeParam Event - The event or interaction this handler processes
 * @typeParam TCore - The transport's Core
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- the constructor assigns every member, and seedcord-gen.ts types them
export abstract class BaseHandler<Event, TCore extends CoreBase> {
    protected readonly event: Event;
    protected readonly logger: Logger;
    /** The bag for this dispatch. Each interaction gets its own. Every handler for one event shares a single bag. */
    protected readonly dispatch: DispatchContext;
    /** The route that started this dispatch. Each handler base narrows it to its own routes. */
    protected readonly route: string;

    protected constructor(
        event: Event,
        public readonly core: TCore,
        dispatch: DispatchContext,
        channel?: LoggerChannelId
    ) {
        this.event = event;
        this.logger = new Logger(this.constructor.name, { channel });
        this.dispatch = dispatch;
        this.route = dispatch.route;
        // runs before subclass fields so that a field initializer can read a member
        Object.assign(this, dispatch[MemberValues]);
    }

    /**
     * Holds the main logic of your handler. The dispatcher calls it after the handler's gates pass, so a
     * gate that refuses stops `execute()` from running.
     */
    abstract execute(): Promisable<void>;
}
