import {
    ActionRowBuilder,
    ButtonBuilder,
    ChannelSelectMenuBuilder,
    CheckboxBuilder,
    CheckboxGroupBuilder,
    CheckboxGroupOptionBuilder,
    ContainerBuilder,
    ContextMenuCommandBuilder,
    EmbedBuilder,
    FileBuilder,
    FileUploadBuilder,
    InteractionContextType,
    LabelBuilder,
    MediaGalleryBuilder,
    MentionableSelectMenuBuilder,
    ModalBuilder,
    RadioGroupBuilder,
    RadioGroupOptionBuilder,
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
    UserSelectMenuBuilder,
    resolveColor
} from 'discord.js';

import { getBotColor } from '@miscellaneous/botColorHolder';

import type { RenderContext, ReplyResponse } from '@seedcord/types';

/**
 * Available Discord.js builder classes for use with BuilderComponent for commands, embeds, modals, etc.
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
    file_upload: FileUploadBuilder,
    checkbox: CheckboxBuilder,
    checkbox_group: CheckboxGroupBuilder,
    checkbox_group_option: CheckboxGroupOptionBuilder,
    radio_group: RadioGroupBuilder,
    radio_group_option: RadioGroupOptionBuilder,

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
 * Available Discord.js action row classes for use with RowComponent for Select Menus and Buttons
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
export type RowType = keyof typeof RowTypes;

/**
 * @internal
 */
export type InstantiatedActionRow<RowKey extends RowType> = InstanceType<(typeof RowTypes)[RowKey]>;

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

    protected constructor(ComponentClass: new () => TComponent) {
        this._component = new ComponentClass();
    }

    /**
     * Returns the live builder, ready to send in a Discord message or nest in another component.
     *
     * Configure it through `this.instance`, not here. Reading this can apply the bot color (see
     * {@link BuilderComponent}), so a read is not side-effect free.
     * @example new SomeComponent().component
     */
    public abstract get component(): InstantiatedBuilder<BuilderType> | InstantiatedActionRow<RowType>;

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
    private colorApplied = false;

    protected constructor(public readonly type: BuilderKey) {
        const ComponentClass = BuilderTypes[type] as unknown;
        super(ComponentClass as new () => InstantiatedBuilder<BuilderKey>);

        if (this.instance instanceof SlashCommandBuilder || this.instance instanceof ContextMenuCommandBuilder) {
            this.instance.setContexts(InteractionContextType.Guild);
        }
    }

    get component(): InstantiatedBuilder<BuilderKey> {
        this.applyBotColor();
        return this.instance;
    }

    // Resolving in the constructor would capture the default for a component built before setBotColor()
    // ran. The unset check keeps a color the subclass set for itself.
    private applyBotColor(): void {
        if (this.colorApplied) return;
        this.colorApplied = true;

        const color = getBotColor();
        if (this.instance instanceof EmbedBuilder) {
            if (this.instance.data.color === undefined) this.instance.setColor(color);
        } else if (this.instance instanceof ContainerBuilder) {
            const accent = this.instance.data.accent_color;
            if (accent === null || accent === undefined) {
                this.instance.setAccentColor(color === 'Default' ? undefined : resolveColor(color));
            }
        }
    }
}

/**
 * Base class for Discord action row components
 *
 * Wraps Discord.js action row builder with Seedcord-specific defaults and helper methods.
 *
 * @typeParam RowKey - The Discord.js action row type being wrapped
 */
export abstract class RowComponent<RowKey extends RowType> extends BaseComponent<InstantiatedActionRow<RowKey>> {
    protected constructor(public readonly type: RowKey) {
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
 * Built fresh inside a {@link Denial}'s `render` to back the embed arm of its reply.
 *
 * @internal
 */
export class DenialEmbed extends BuilderComponent<'embed'> {
    /**
     * Creates a new error embed.
     *
     * @param description - The body text shown to the user.
     * @param title - The heading shown above the body. Defaults to `Cannot Proceed`.
     */
    public constructor(description: string, title = 'Cannot Proceed') {
        super('embed');
        this.instance.setTitle(title).setDescription(description);
    }
}

/**
 * Base class for a user-facing refusal or a reported fault.
 *
 * Throw a `Denial` to stop a handler and reply to the user. The framework catches it at the controller
 * boundary and renders {@link Denial.render}, which always decides what the user sees. With `report`
 * false (the default) that render is all that happens. With `report` true the framework also logs the
 * fault and publishes it to the `handledException` bus. A raw, non-Denial throw shows the generic message.
 */
export abstract class Denial extends Error {
    /**
     * Whether this denial is a reported fault. True also logs it and publishes it to the `handledException`
     * bus. The user always sees {@link Denial.render} either way.
     */
    public report = false;

    protected constructor(message: string, options?: ErrorOptions) {
        super(message, options);

        // Error sets name to 'Error', so stamp the concrete subclass name for logs and the fault report
        this.name = new.target.name;
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Builds what the user sees. Called fresh each time the denial is shown, so the builders are new
     * and the bot color resolves at render time rather than at construction time.
     */
    public abstract render(ctx: RenderContext): ReplyResponse;
}
