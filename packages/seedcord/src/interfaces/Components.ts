import { hexToNumber } from '@seedcord/utils';
import {
    ActionRowBuilder,
    ButtonBuilder,
    ChannelSelectMenuBuilder,
    ContainerBuilder,
    ContextMenuCommandBuilder,
    EmbedBuilder,
    FileBuilder,
    InteractionContextType,
    LabelBuilder,
    MediaGalleryBuilder,
    MentionableSelectMenuBuilder,
    ModalBuilder,
    RoleSelectMenuBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SlashCommandBuilder,
    SlashCommandSubcommandBuilder,
    SlashCommandSubcommandGroupBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextDisplayBuilder,
    TextInputBuilder,
    UserSelectMenuBuilder
} from 'discord.js';
import { Envapt } from 'envapt';

import { parseEnvColor } from '../miscellaneous/parseEnvColor';

import type { ColorResolvable } from 'discord.js';

/**
 * Available Discord.js builder classes for use with BuilderComponent
 *
 * @internal
 */
export const BuilderTypes = {
    // Command Components
    command: SlashCommandBuilder,
    context_menu: ContextMenuCommandBuilder,
    subcommand: SlashCommandSubcommandBuilder,
    group: SlashCommandSubcommandGroupBuilder,

    // Embed Components
    embed: EmbedBuilder,

    // Modal Components
    modal: ModalBuilder,
    label: LabelBuilder,
    text_input: TextInputBuilder,

    // Action Row Components
    button: ButtonBuilder,
    menu_string: StringSelectMenuBuilder,
    menu_option_string: StringSelectMenuOptionBuilder,
    menu_user: UserSelectMenuBuilder,
    menu_channel: ChannelSelectMenuBuilder,
    menu_mentionable: MentionableSelectMenuBuilder,
    menu_role: RoleSelectMenuBuilder,

    // ComponentsV2
    container: ContainerBuilder,
    text_display: TextDisplayBuilder,
    file: FileBuilder,
    media: MediaGalleryBuilder,
    section: SectionBuilder,
    separator: SeparatorBuilder
};

/**
 * Available Discord.js action row classes for use with RowComponent
 *
 * @internal
 */
export const RowTypes: {
    button: typeof ActionRowBuilder<ButtonBuilder>;
    menu_string: typeof ActionRowBuilder<StringSelectMenuBuilder>;
    menu_user: typeof ActionRowBuilder<UserSelectMenuBuilder>;
    menu_channel: typeof ActionRowBuilder<ChannelSelectMenuBuilder>;
    menu_mentionable: typeof ActionRowBuilder<MentionableSelectMenuBuilder>;
    menu_role: typeof ActionRowBuilder<RoleSelectMenuBuilder>;
} = {
    button: ActionRowBuilder<ButtonBuilder>,
    menu_string: ActionRowBuilder<StringSelectMenuBuilder>,
    menu_user: ActionRowBuilder<UserSelectMenuBuilder>,
    menu_channel: ActionRowBuilder<ChannelSelectMenuBuilder>,
    menu_mentionable: ActionRowBuilder<MentionableSelectMenuBuilder>,
    menu_role: ActionRowBuilder<RoleSelectMenuBuilder>
};

/**
 * Available Discord.js builder types for use with BuilderComponent
 */
export type BuilderType = keyof typeof BuilderTypes;

/**
 * @internal
 */
export type InstantiatedBuilder<BuilderKey extends BuilderType> = InstanceType<(typeof BuilderTypes)[BuilderKey]>;

/**
 * Available Discord.js action row types for use with RowComponent
 */
export type ActionRowComponentType = keyof typeof RowTypes;

/**
 * @internal
 */
export type InstantiatedActionRow<RowKey extends ActionRowComponentType> = InstanceType<(typeof RowTypes)[RowKey]>;

/**
 * Base class for Discord component wrappers
 *
 * Provides common functionality for building Discord components with proper typing.
 *
 * @typeParam TComponent - The Discord.js component type being wrapped
 *
 * @internal
 */
export abstract class BaseComponent<TComponent> {
    private readonly _component: TComponent;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    protected constructor(ComponentClass: new () => TComponent) {
        this._component = new ComponentClass();
    }

    /**
     * Gets the built component (should be considered read-only)
     *
     * Returns the finalized component ready for use in Discord messages.
     *
     * Please do not use for further configuration, use `this.instance` for that.
     * @example new SomeComponent().component
     */
    public abstract get component(): InstantiatedBuilder<BuilderType> | InstantiatedActionRow<ActionRowComponentType>;

    /**
     * Gets the component instance for configuration
     *
     * Use this to access Discord.js builder methods like setTitle(), setDescription(), etc.
     *
     * Use this in your component classes to configure the builder
     * @example this.instance.setTitle('My Modal')
     */
    protected get instance(): TComponent {
        return this._component;
    }

    /**
     * Builds a customId string for interactive components
     *
     * Creates customIds in the format `prefix:arg1-arg2-arg3` for buttons, modals, etc.
     * Arguments are joined with hyphens and separated from prefix with a colon.
     *
     * @param prefix - The route prefix that handlers will match against
     * @param args - Additional arguments to encode in the customId
     * @returns Formatted customId string
     */
    public buildCustomId(prefix: string, ...args: string[]): string {
        if (args.length === 0) return prefix;
        return `${prefix}:${args.join('-')}`;
    }
}

/**
 * Base class for Discord.js builder components
 *
 * Wraps Discord.js builders (SlashCommandBuilder, EmbedBuilder, etc.) with
 * Seedcord-specific defaults and helper methods.
 *
 * @typeParam BuilderKey - The type of Discord.js builder being wrapped
 */
export abstract class BuilderComponent<BuilderKey extends BuilderType> extends BaseComponent<
    InstantiatedBuilder<BuilderKey>
> {
    /**
     * Bot color for the component
     * Uses the DEFAULT_BOT_COLOR environment variable or falls back to 'Default' set by Discord.js.
     *
     * Set DEFAULT_BOT_COLOR to a hex code in your `.env` file to customize.
     */
    @Envapt<ColorResolvable>('DEFAULT_BOT_COLOR', {
        fallback: 'Default',
        converter: (raw, fallback) => parseEnvColor(raw, fallback)
    })
    declare public readonly botColor: ColorResolvable;

    protected constructor(type: BuilderKey) {
        const ComponentClass = BuilderTypes[type] as unknown;
        super(ComponentClass as new () => InstantiatedBuilder<BuilderKey>);

        // Override in builders
        if (this.instance instanceof EmbedBuilder) this.instance.setColor(this.botColor);

        // Override in builders
        if (this.instance instanceof ContainerBuilder) {
            this.instance.setAccentColor(
                this.botColor === 'Default' ? undefined : hexToNumber(this.botColor.toString())
            );
        }

        // Override in builders
        if (this.instance instanceof SlashCommandBuilder || this.instance instanceof ContextMenuCommandBuilder) {
            this.instance.setContexts(InteractionContextType.Guild);
        }
    }

    get component(): InstantiatedBuilder<BuilderKey> {
        // TODO: Add checks for specific builders that make sure mandatory fields are set

        return this.instance;
    }
}

/**
 * Base class for Discord action row components
 *
 * Wraps Discord.js action row builder with Seedcord-specific defaults and helper methods.
 *
 * @typeParam RowKey - The Discord.js action row type being wrapped
 */
export abstract class RowComponent<RowKey extends ActionRowComponentType> extends BaseComponent<
    InstantiatedActionRow<RowKey>
> {
    protected constructor(type: RowKey) {
        const ComponentClass = RowTypes[type] as unknown;
        super(ComponentClass as new () => InstantiatedActionRow<RowKey>);
    }

    get component(): InstantiatedActionRow<RowKey> {
        return this.instance;
    }
}

/**
 * Pre-configured error embed with default styling
 *
 * This is bundled in {@link CustomError}s as the response.
 */
export class BaseErrorEmbed extends BuilderComponent<'embed'> {
    /**
     * Creates a new error embed with default configuration.
     */
    public constructor() {
        super('embed');
        this.instance.setTitle('Cannot Proceed');
    }
}

/**
 * Base class for custom error types with Discord embed responses
 *
 * Errors extending CustomError should be used with the `Catchable` decorators to implement a control flow. These errors will be caught and handled by the framework to show the user the configured response.
 */
export abstract class CustomError extends Error {
    private _emit = false;
    public readonly response = new BaseErrorEmbed().component;

    protected constructor(public override message: string) {
        super(message);

        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Whether this error should be emitted to logs
     *
     * Controls logging behavior. Errors with emit=true will always be logged,
     * while emit=false errors may be suppressed in production.
     *
     * @returns True if the error should be logged
     */
    public get emit(): boolean {
        return this._emit;
    }

    /**
     * Sets whether this error should be emitted to logs
     */
    public set emit(value: boolean) {
        this._emit = value;
    }
}

/** Constructor type for custom error classes */
export type CustomErrorConstructor = new (message: string, ...args: any[]) => CustomError;
