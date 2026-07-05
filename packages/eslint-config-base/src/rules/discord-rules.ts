import type { Linter } from 'eslint';

// discord.js ships the CJS copy of these, mixing it into a core (ESM) component breaks instanceof + toJSON
const DISCORD_JS_BUILDERS = [
    'ActionRowBuilder',
    'ButtonBuilder',
    'ChannelSelectMenuBuilder',
    'CheckboxBuilder',
    'CheckboxGroupBuilder',
    'CheckboxGroupOptionBuilder',
    'ContainerBuilder',
    'ContextMenuCommandBuilder',
    'EmbedBuilder',
    'FileBuilder',
    'FileUploadBuilder',
    'LabelBuilder',
    'MediaGalleryBuilder',
    'MediaGalleryItemBuilder',
    'MentionableSelectMenuBuilder',
    'ModalBuilder',
    'RadioGroupBuilder',
    'RadioGroupOptionBuilder',
    'RoleSelectMenuBuilder',
    'SectionBuilder',
    'SeparatorBuilder',
    'SlashCommandBuilder',
    'SlashCommandSubcommandBuilder',
    'SlashCommandSubcommandGroupBuilder',
    'StringSelectMenuBuilder',
    'StringSelectMenuOptionBuilder',
    'TextDisplayBuilder',
    'TextInputBuilder',
    'ThumbnailBuilder',
    'UserSelectMenuBuilder'
];

// opt-in via the discordRules option
export const DISCORD_RULES: Linter.RulesRecord = {
    'no-restricted-imports': [
        'error',
        {
            paths: [
                {
                    name: 'discord.js',
                    importNames: DISCORD_JS_BUILDERS,
                    message:
                        "Import component builders from '@discordjs/builders'. The discord.js re-export is a separate CJS copy that breaks instanceof and toJSON when nested in a seedcord component."
                }
            ]
        }
    ]
};
