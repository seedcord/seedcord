import dedent from 'dedent';

import rule from '../../../src/rules/discord/prefer-ephemeral-flag';
import { createTypedRuleTester } from '../../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('prefer-ephemeral-flag', rule, {
    valid: [
        // already using flags
        dedent`
            import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
            declare const interaction: ChatInputCommandInteraction;
            interaction.reply({ content: 'hi', flags: MessageFlags.Ephemeral });
        `,
        // no ephemeral option at all
        dedent`
            import { ChatInputCommandInteraction } from 'discord.js';
            declare const interaction: ChatInputCommandInteraction;
            interaction.reply({ content: 'hi' });
        `,
        // a channel send is not an interaction reply
        dedent`
            import { TextChannel } from 'discord.js';
            declare const channel: TextChannel;
            channel.send({ content: 'hi' });
        `,
        // a non-interaction object with a reply method is not flagged
        dedent`
            declare const mock: { reply(options: { ephemeral: boolean }): void };
            mock.reply({ ephemeral: true });
        `
    ],
    invalid: [
        {
            // autofixed because MessageFlags is imported and there is no existing flags key
            code: dedent`
                import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                interaction.reply({ content: 'hi', ephemeral: true });
            `,
            output: dedent`
                import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                interaction.reply({ content: 'hi', flags: MessageFlags.Ephemeral });
            `,
            errors: [{ messageId: 'deprecated' }]
        },
        {
            code: dedent`
                import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                interaction.deferReply({ ephemeral: true });
            `,
            output: dedent`
                import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                interaction.deferReply({ flags: MessageFlags.Ephemeral });
            `,
            errors: [{ messageId: 'deprecated' }]
        },
        {
            // followUp autofix path
            code: dedent`
                import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                interaction.followUp({ ephemeral: true, content: 'x' });
            `,
            output: dedent`
                import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                interaction.followUp({ flags: MessageFlags.Ephemeral, content: 'x' });
            `,
            errors: [{ messageId: 'deprecated' }]
        },
        {
            // ephemeral: false is still deprecated, flagged but not auto-rewritten
            code: dedent`
                import { ChatInputCommandInteraction } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                interaction.followUp({ ephemeral: false, content: 'x' });
            `,
            output: null,
            errors: [{ messageId: 'deprecated' }]
        },
        {
            // MessageFlags is not imported, so the flag stays but no fix is applied
            code: dedent`
                import { ChatInputCommandInteraction } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                interaction.reply({ ephemeral: true });
            `,
            output: null,
            errors: [{ messageId: 'deprecated' }]
        },
        {
            // an existing flags key blocks the autofix
            code: dedent`
                import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                interaction.reply({ content: 'hi', ephemeral: true, flags: 0 });
            `,
            output: null,
            errors: [{ messageId: 'deprecated' }]
        },
        {
            // a spread in the options blocks the autofix
            code: dedent`
                import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                declare const base: object;
                interaction.reply({ ...base, ephemeral: true });
            `,
            output: null,
            errors: [{ messageId: 'deprecated' }]
        },
        {
            // options built into a variable are still inspected
            code: dedent`
                import { ChatInputCommandInteraction } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                const opts = { ephemeral: true, content: 'x' };
                interaction.reply(opts);
            `,
            output: null,
            errors: [{ messageId: 'deprecated' }]
        },
        {
            // FP-04: aliased import must produce alias in the fix text, not the original export name
            code: dedent`
                import { ChatInputCommandInteraction, MessageFlags as MF } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                interaction.reply({ content: 'hi', ephemeral: true });
            `,
            output: dedent`
                import { ChatInputCommandInteraction, MessageFlags as MF } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                interaction.reply({ content: 'hi', flags: MF.Ephemeral });
            `,
            errors: [{ messageId: 'deprecated' }]
        },
        {
            // FN-21: destructured reply from a BaseInteraction is still flagged
            code: dedent`
                import { ChatInputCommandInteraction } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                const { reply } = interaction;
                reply({ ephemeral: true, content: 'hi' });
            `,
            output: null,
            errors: [{ messageId: 'deprecated' }]
        },
        {
            // MT-25: variable-resolved options with MessageFlags imported — fix rewrites the initializer
            code: dedent`
                import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                const opts = { ephemeral: true, content: 'x' };
                interaction.reply(opts);
            `,
            output: dedent`
                import { ChatInputCommandInteraction, MessageFlags } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                const opts = { flags: MessageFlags.Ephemeral, content: 'x' };
                interaction.reply(opts);
            `,
            errors: [{ messageId: 'deprecated' }]
        }
    ]
});
