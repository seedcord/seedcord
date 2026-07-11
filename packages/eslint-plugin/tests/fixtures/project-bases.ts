import { BuilderComponent } from './seedcord';

// Local stand-ins for seedcord's base classes. extendsSeedcordType matches by class name only, so a
// project abstract base extending one of these reproduces the cross-file case the decorator rules flag.

export abstract class EventHandler<EventName> {
    declare public readonly event: EventName;
}

export abstract class BaseEvent extends EventHandler<string> {}

export abstract class SlashHandler<HandlerId extends string> {
    declare public readonly id: HandlerId;
}

export abstract class BaseSlash extends SlashHandler<'ban'> {}

export abstract class EventMiddleware {
    public abstract handle(): void;
}

export abstract class Subscriber<KeyOfSubscribers extends string> {
    declare public readonly key: KeyOfSubscribers;
}

export abstract class WebhookLog<KeyOfSubscribers extends string> extends Subscriber<KeyOfSubscribers> {
    public abstract report(): unknown;
}

export abstract class BaseSub extends Subscriber<'unknownException'> {}

export abstract class BaseReporter extends WebhookLog<'unknownException'> {}

export abstract class BaseMw extends EventMiddleware {}

export abstract class BaseCommand extends BuilderComponent<'command'> {
    protected constructor() {
        super('command');
    }
}

export abstract class BaseContextMenu extends BuilderComponent<'context_menu'> {
    protected constructor() {
        super('context_menu');
    }
}
