// local stub of seedcord's component wrappers. importing the real `seedcord` here would cycle with
// eslint-config's dependency on the plugin.
import {
    ActionRowBuilder,
    ContainerBuilder,
    ContextMenuCommandBuilder,
    EmbedBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder
} from 'discord.js';

const BuilderTypes = {
    command: SlashCommandBuilder,
    context_menu: ContextMenuCommandBuilder,
    embed: EmbedBuilder,
    menu_string: StringSelectMenuBuilder,
    container: ContainerBuilder
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
