// local stub of seedcord's component wrappers. importing the real `seedcord` here would cycle with
// eslint-config's dependency on the plugin.
import {
    ActionRowBuilder,
    ButtonBuilder,
    ContainerBuilder,
    ContextMenuCommandBuilder,
    EmbedBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder
} from 'discord.js';

import type {
    AnySelectMenuInteraction,
    AutocompleteInteraction,
    ButtonInteraction,
    ChatInputCommandInteraction,
    ContextMenuCommandInteraction,
    ModalSubmitInteraction
} from 'discord.js';

const BuilderTypes = {
    command: SlashCommandBuilder,
    context_menu: ContextMenuCommandBuilder,
    embed: EmbedBuilder,
    menu_string: StringSelectMenuBuilder,
    container: ContainerBuilder,
    button: ButtonBuilder
} as const;

type BuilderType = keyof typeof BuilderTypes;
type InstantiatedBuilder<Key extends BuilderType> = InstanceType<(typeof BuilderTypes)[Key]>;

export abstract class BuilderComponent<Key extends BuilderType> {
    protected readonly instance: InstantiatedBuilder<Key>;

    protected constructor(public readonly type: Key) {
        this.instance = new BuilderTypes[type]() as InstantiatedBuilder<Key>;
    }

    get component(): InstantiatedBuilder<Key> {
        return this.instance;
    }
}

const RowTypes = {
    button: ActionRowBuilder,
    menu_string: ActionRowBuilder
} as const;

type RowType = keyof typeof RowTypes;
type InstantiatedActionRow<Key extends RowType> = InstanceType<(typeof RowTypes)[Key]>;

export abstract class RowComponent<Key extends RowType> {
    protected readonly instance: InstantiatedActionRow<Key>;

    protected constructor(public readonly type: Key) {
        this.instance = new RowTypes[type]() as InstantiatedActionRow<Key>;
    }

    get component(): InstantiatedActionRow<Key> {
        return this.instance;
    }
}

// no-raw-interaction-acks reads this.event's djs type, so the stubs type event as the matching interaction.
// detection never reads the reply members (this.reply and kin), so the stubs omit them.

type Repliable =
    | ChatInputCommandInteraction
    | ButtonInteraction
    | ModalSubmitInteraction
    | AnySelectMenuInteraction
    | ContextMenuCommandInteraction;

abstract class BaseHandler<Event> {
    protected readonly event!: Event;
    abstract execute(): Promise<void>;
}

export abstract class InteractionHandler<Event extends Repliable> extends BaseHandler<Event> {}

export abstract class SlashHandler<Route extends string> extends InteractionHandler<ChatInputCommandInteraction> {
    declare protected readonly route: Route;
}

export abstract class ContextMenuHandler<Kind> extends InteractionHandler<ContextMenuCommandInteraction> {
    declare protected readonly kind: Kind;
}

export abstract class ComponentHandler<Event extends Repliable, Defs> extends InteractionHandler<Event> {
    declare protected readonly defs: Defs;
}

export abstract class ButtonHandler<Defs> extends ComponentHandler<ButtonInteraction, Defs> {}

export abstract class ModalHandler<Defs> extends ComponentHandler<ModalSubmitInteraction, Defs> {}

export abstract class SelectMenuHandler<Defs> extends ComponentHandler<AnySelectMenuInteraction, Defs> {}

// AutocompleteHandler extends BaseHandler directly, so it never passes the InteractionHandler gate.
export abstract class AutocompleteHandler<Route extends string> extends BaseHandler<AutocompleteInteraction> {
    declare protected readonly route: Route;
    protected respond(): Promise<void> {
        return this.event.respond([]);
    }
}

// a repliable this.event, but extends BaseHandler directly so it never passes the InteractionHandler gate
export abstract class InteractionMiddleware<Event extends Repliable> extends BaseHandler<Event> {}

export abstract class EventMiddleware<Event = unknown> extends BaseHandler<Event> {}
