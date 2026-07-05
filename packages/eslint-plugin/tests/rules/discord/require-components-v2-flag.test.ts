import dedent from 'dedent';

import rule from '../../../src/rules/discord/require-components-v2-flag';
import { createTypedRuleTester } from '../../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('require-components-v2-flag', rule, {
    valid: [
        // the flag set through the MessageFlags enum
        dedent`
            import { TextChannel, ContainerBuilder, MessageFlags } from 'discord.js';
            declare const channel: TextChannel;
            channel.send({ components: [new ContainerBuilder()], flags: MessageFlags.IsComponentsV2 });
        `,
        // the flag set through its numeric wire value
        dedent`
            import { TextChannel, ContainerBuilder } from 'discord.js';
            declare const channel: TextChannel;
            channel.send({ components: [new ContainerBuilder()], flags: 32768 });
        `,
        // the flag set through the string key discord.js resolves
        dedent`
            import { TextChannel, ContainerBuilder } from 'discord.js';
            declare const channel: TextChannel;
            channel.send({ components: [new ContainerBuilder()], flags: 'IsComponentsV2' });
        `,
        // the flag set through the numeric string discord.js resolves
        dedent`
            import { TextChannel, ContainerBuilder } from 'discord.js';
            declare const channel: TextChannel;
            channel.send({ components: [new ContainerBuilder()], flags: '32768' });
        `,
        // the flag set through an array of flags
        dedent`
            import { TextChannel, ContainerBuilder, MessageFlags } from 'discord.js';
            declare const channel: TextChannel;
            channel.send({ components: [new ContainerBuilder()], flags: [MessageFlags.IsComponentsV2] });
        `,
        // a const flag resolves through its enum literal type
        dedent`
            import { TextChannel, ContainerBuilder, MessageFlags } from 'discord.js';
            declare const channel: TextChannel;
            const F = MessageFlags.IsComponentsV2;
            channel.send({ components: [new ContainerBuilder()], flags: F });
        `,
        // a const numeric flag resolves the same way
        dedent`
            import { TextChannel, ContainerBuilder } from 'discord.js';
            declare const channel: TextChannel;
            const F = 32768;
            channel.send({ components: [new ContainerBuilder()], flags: F });
        `,
        // a let flag widens to number, so it is skipped even though the value would be present
        dedent`
            import { TextChannel, ContainerBuilder } from 'discord.js';
            declare const channel: TextChannel;
            let F = 32768;
            channel.send({ components: [new ContainerBuilder()], flags: F });
        `,
        // satisfies keeps the literal type
        dedent`
            import { TextChannel, ContainerBuilder } from 'discord.js';
            declare const channel: TextChannel;
            channel.send({ components: [new ContainerBuilder()], flags: 32768 satisfies number });
        `,
        // editReply is a message-options position and the flag is set
        dedent`
            import { ChatInputCommandInteraction, ContainerBuilder, MessageFlags } from 'discord.js';
            declare const interaction: ChatInputCommandInteraction;
            interaction.editReply({ components: [new ContainerBuilder()], flags: MessageFlags.IsComponentsV2 });
        `,
        // a bitwise combination that includes the flag folds to present
        dedent`
            import { TextChannel, ContainerBuilder, MessageFlags } from 'discord.js';
            declare const channel: TextChannel;
            channel.send({ components: [new ContainerBuilder()], flags: MessageFlags.IsComponentsV2 | MessageFlags.SuppressNotifications });
        `,
        // a shifted literal folds to the flag bit
        dedent`
            import { TextChannel, ContainerBuilder } from 'discord.js';
            declare const channel: TextChannel;
            channel.send({ components: [new ContainerBuilder()], flags: 1 << 15 });
        `,
        // one unresolvable operand makes the whole combination unreadable, so it is left alone
        dedent`
            import { TextChannel, ContainerBuilder, MessageFlags } from 'discord.js';
            declare const channel: TextChannel;
            declare const bits: number;
            channel.send({ components: [new ContainerBuilder()], flags: MessageFlags.IsComponentsV2 | bits });
        `,
        // a flags value read from a variable is left alone
        dedent`
            import { TextChannel, ContainerBuilder } from 'discord.js';
            declare const channel: TextChannel;
            declare const bits: number;
            channel.send({ components: [new ContainerBuilder()], flags: bits });
        `,
        // an action row is not a v2 builder, so no flag is required
        dedent`
            import { TextChannel, ActionRowBuilder } from 'discord.js';
            declare const channel: TextChannel;
            channel.send({ components: [new ActionRowBuilder()] });
        `,
        // no v2 components at all
        dedent`
            import { TextChannel } from 'discord.js';
            declare const channel: TextChannel;
            channel.send({ content: 'hi' });
        `,
        // the payload is not a discord.js message-options position
        dedent`
            import { ContainerBuilder } from 'discord.js';
            declare function render(opts: { components: unknown[] }): void;
            render({ components: [new ContainerBuilder()] });
        `,
        // an unannotated payload variable that sets the flag
        dedent`
            import { TextChannel, ContainerBuilder, MessageFlags } from 'discord.js';
            declare const channel: TextChannel;
            const payload = { components: [new ContainerBuilder()], flags: MessageFlags.IsComponentsV2 };
            channel.send(payload);
        `,
        // an unannotated payload variable passed somewhere that is not a message position
        dedent`
            import { ContainerBuilder } from 'discord.js';
            declare function render(opts: { components: unknown[] }): void;
            const payload = { components: [new ContainerBuilder()] };
            render(payload);
        `,
        // a reassigned payload variable, its initializer is dead, so it is skipped
        dedent`
            import { TextChannel, ContainerBuilder } from 'discord.js';
            declare const channel: TextChannel;
            let payload = { components: [new ContainerBuilder()] };
            payload = { components: [] };
            channel.send(payload);
        `,
        // the flag is added at the spread site, so the inline payload is valid
        dedent`
            import { TextChannel, ContainerBuilder, MessageFlags } from 'discord.js';
            declare const channel: TextChannel;
            const base = { components: [new ContainerBuilder()] };
            channel.send({ ...base, flags: MessageFlags.IsComponentsV2 });
        `,
        // a spread of an as-const object resolves its flag to present
        dedent`
            import { TextChannel, ContainerBuilder, MessageFlags } from 'discord.js';
            declare const channel: TextChannel;
            const base = { flags: MessageFlags.IsComponentsV2 } as const;
            channel.send({ ...base, components: [new ContainerBuilder()] });
        `,
        // a spread whose flag type is a plain number is unreadable, so it is left alone
        dedent`
            import { TextChannel, ContainerBuilder } from 'discord.js';
            declare const channel: TextChannel;
            declare const base: { flags: number };
            channel.send({ ...base, components: [new ContainerBuilder()] });
        `,
        // an inferred object literal widens its flag to the enum, so a non-v2 spread is left alone (a known miss)
        dedent`
            import { TextChannel, ContainerBuilder, MessageFlags } from 'discord.js';
            declare const channel: TextChannel;
            const base = { flags: MessageFlags.SuppressNotifications };
            channel.send({ ...base, components: [new ContainerBuilder()] });
        `,
        // a later as-const spread overrides the explicit non-v2 flag with the v2 flag
        dedent`
            import { TextChannel, ContainerBuilder, MessageFlags } from 'discord.js';
            declare const channel: TextChannel;
            const base = { flags: MessageFlags.IsComponentsV2 } as const;
            channel.send({ flags: MessageFlags.SuppressNotifications, ...base, components: [new ContainerBuilder()] });
        `,
        // a later components key overrides the v2 spread, so no flag is required
        dedent`
            import { TextChannel, ContainerBuilder, ActionRowBuilder } from 'discord.js';
            declare const channel: TextChannel;
            const base = { components: [new ContainerBuilder()] };
            channel.send({ ...base, components: [new ActionRowBuilder()] });
        `,
        // an as cast around the value still folds
        dedent`
            import { TextChannel, ContainerBuilder } from 'discord.js';
            declare const channel: TextChannel;
            channel.send({ components: [new ContainerBuilder()], flags: 32768 as number });
        `,
        // a negated literal folds, -1 sets every bit
        dedent`
            import { TextChannel, ContainerBuilder } from 'discord.js';
            declare const channel: TextChannel;
            channel.send({ components: [new ContainerBuilder()], flags: -1 });
        `,
        // a spread of an as-const tuple resolves inside the flags array
        dedent`
            import { TextChannel, ContainerBuilder, MessageFlags } from 'discord.js';
            declare const channel: TextChannel;
            const extra = [MessageFlags.IsComponentsV2] as const;
            channel.send({ components: [new ContainerBuilder()], flags: [...extra] });
        `,
        // a spread of a plain number array is unreadable, so the array is left alone
        dedent`
            import { TextChannel, ContainerBuilder, MessageFlags } from 'discord.js';
            declare const channel: TextChannel;
            declare const extra: number[];
            channel.send({ components: [new ContainerBuilder()], flags: [MessageFlags.SuppressEmbeds, ...extra] });
        `,
        // an interaction reply with the flag set
        dedent`
            import { ChatInputCommandInteraction, ContainerBuilder, MessageFlags } from 'discord.js';
            declare const interaction: ChatInputCommandInteraction;
            interaction.reply({ components: [new ContainerBuilder()], flags: MessageFlags.IsComponentsV2 });
        `
    ],
    invalid: [
        {
            // v2 components with no IsComponentsV2 flag
            code: dedent`
                import { TextChannel, ContainerBuilder } from 'discord.js';
                declare const channel: TextChannel;
                channel.send({ components: [new ContainerBuilder()] });
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // a zero literal sets no bit
            code: dedent`
                import { TextChannel, ContainerBuilder } from 'discord.js';
                declare const channel: TextChannel;
                channel.send({ components: [new ContainerBuilder()], flags: 0 });
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // a bitwise AND that clears every set bit folds to absent
            code: dedent`
                import { TextChannel, ContainerBuilder, MessageFlags } from 'discord.js';
                declare const channel: TextChannel;
                channel.send({ components: [new ContainerBuilder()], flags: MessageFlags.IsComponentsV2 & MessageFlags.SuppressEmbeds });
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // v2 components supplied through a variable, no flag anywhere
            code: dedent`
                import { TextChannel, ContainerBuilder } from 'discord.js';
                declare const channel: TextChannel;
                const comps = [new ContainerBuilder()];
                channel.send({ components: comps });
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // a const flag that resolves to a non-v2 value
            code: dedent`
                import { TextChannel, ContainerBuilder, MessageFlags } from 'discord.js';
                declare const channel: TextChannel;
                const F = MessageFlags.SuppressEmbeds;
                channel.send({ components: [new ContainerBuilder()], flags: F });
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // a non-v2 literal behind an as cast still folds to absent
            code: dedent`
                import { TextChannel, ContainerBuilder } from 'discord.js';
                declare const channel: TextChannel;
                channel.send({ components: [new ContainerBuilder()], flags: 4 as number });
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            code: dedent`
                import { ChatInputCommandInteraction, ContainerBuilder } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                interaction.followUp({ components: [new ContainerBuilder()] });
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            code: dedent`
                import { ChatInputCommandInteraction, ContainerBuilder } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                interaction.editReply({ components: [new ContainerBuilder()] });
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // a flag is set, but not IsComponentsV2
            code: dedent`
                import { TextChannel, ContainerBuilder, MessageFlags } from 'discord.js';
                declare const channel: TextChannel;
                channel.send({ components: [new ContainerBuilder()], flags: MessageFlags.SuppressNotifications });
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // an empty flags array sets nothing
            code: dedent`
                import { TextChannel, ContainerBuilder } from 'discord.js';
                declare const channel: TextChannel;
                channel.send({ components: [new ContainerBuilder()], flags: [] });
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // a bitwise combination of non-v2 flags folds to absent
            code: dedent`
                import { TextChannel, ContainerBuilder, MessageFlags } from 'discord.js';
                declare const channel: TextChannel;
                channel.send({ components: [new ContainerBuilder()], flags: MessageFlags.SuppressEmbeds | MessageFlags.SuppressNotifications });
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // a shift to a non-v2 bit folds to absent
            code: dedent`
                import { TextChannel, ContainerBuilder } from 'discord.js';
                declare const channel: TextChannel;
                channel.send({ components: [new ContainerBuilder()], flags: 1 << 6 });
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // a complement clears the v2 bit
            code: dedent`
                import { TextChannel, ContainerBuilder } from 'discord.js';
                declare const channel: TextChannel;
                channel.send({ components: [new ContainerBuilder()], flags: ~32768 });
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // a string key that is a different flag
            code: dedent`
                import { TextChannel, ContainerBuilder } from 'discord.js';
                declare const channel: TextChannel;
                channel.send({ components: [new ContainerBuilder()], flags: 'SuppressEmbeds' });
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // an interaction reply missing the flag
            code: dedent`
                import { ChatInputCommandInteraction, ContainerBuilder } from 'discord.js';
                declare const interaction: ChatInputCommandInteraction;
                interaction.reply({ components: [new ContainerBuilder()] });
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // v2 components arrive through a spread, still no flag anywhere
            code: dedent`
                import { TextChannel, ContainerBuilder } from 'discord.js';
                declare const channel: TextChannel;
                const base = { components: [new ContainerBuilder()] };
                channel.send({ ...base });
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // an unannotated payload variable resolves through the send call
            code: dedent`
                import { TextChannel, ContainerBuilder } from 'discord.js';
                declare const channel: TextChannel;
                const payload = { components: [new ContainerBuilder()] };
                channel.send(payload);
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // an annotated payload variable is reported exactly once
            code: dedent`
                import { TextChannel, ContainerBuilder } from 'discord.js';
                import type { MessageCreateOptions } from 'discord.js';
                declare const channel: TextChannel;
                const payload: MessageCreateOptions = { components: [new ContainerBuilder()] };
                channel.send(payload);
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // a payload reused across sends is one fix at one declaration, reported once
            code: dedent`
                import { TextChannel, ContainerBuilder } from 'discord.js';
                declare const channel: TextChannel;
                const payload = { components: [new ContainerBuilder()] };
                channel.send(payload);
                channel.send(payload);
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // a subclass of a v2 builder resolves through its base chain
            code: dedent`
                import { TextChannel, ContainerBuilder } from 'discord.js';
                declare const channel: TextChannel;
                class MyContainer extends ContainerBuilder {}
                channel.send({ components: [new MyContainer()] });
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // a spread carries a non-v2 flag read from its as-const type
            code: dedent`
                import { TextChannel, ContainerBuilder, MessageFlags } from 'discord.js';
                declare const channel: TextChannel;
                const base = { flags: MessageFlags.SuppressNotifications } as const;
                channel.send({ ...base, components: [new ContainerBuilder()] });
            `,
            errors: [{ messageId: 'missingFlag' }]
        },
        {
            // a later as-const spread overrides an explicit v2 flag with a non-v2 one
            code: dedent`
                import { TextChannel, ContainerBuilder, MessageFlags } from 'discord.js';
                declare const channel: TextChannel;
                const base = { flags: MessageFlags.SuppressNotifications } as const;
                channel.send({ flags: MessageFlags.IsComponentsV2, ...base, components: [new ContainerBuilder()] });
            `,
            errors: [{ messageId: 'missingFlag' }]
        }
    ]
});
