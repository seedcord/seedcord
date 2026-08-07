import { Logger } from '@seedcord/logger';

import type { CoreBase } from '@interfaces/CoreBase';
import type { LoggerChannelId } from '@seedcord/logger';
import type { DispatchContext } from '@src/dispatch/DispatchContext';

/**
 * Base class every transport handler extends. Don't register handlers directly. Use the more specific
 * handler subclasses.
 *
 * @typeParam Event - The event or interaction this handler processes
 * @typeParam TCore - The transport's Core
 */
export abstract class BaseHandler<Event, TCore extends CoreBase> {
    protected readonly event: Event;
    protected readonly logger: Logger;
    // absent on event handlers
    protected readonly dispatch?: DispatchContext | undefined;

    protected constructor(
        event: Event,
        public readonly core: TCore,
        dispatch?: DispatchContext,
        channel?: LoggerChannelId
    ) {
        this.event = event;
        this.logger = new Logger(this.constructor.name, { channel });
        this.dispatch = dispatch;
    }

    /**
     * Holds the main logic of your handler. The dispatcher calls it after the handler's gates pass, so a
     * gate that refuses stops `execute()` from running.
     */
    abstract execute(): Promise<void>;
}
