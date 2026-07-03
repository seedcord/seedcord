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
    UserSelectMenuBuilder
} from '@discordjs/builders';

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
