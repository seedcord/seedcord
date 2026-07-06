import dedent from 'dedent';

import rule from '../../src/rules/use-custom-id-codec';
import { createTypedRuleTester } from '../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('use-custom-id-codec', rule, {
    valid: [
        // the codec is the intended path, an encode() call is not a raw literal
        dedent`
            import { ButtonBuilder } from 'discord.js';
            declare const ApproveId: { encode(data: object): string };
            declare const id: string;
            new ButtonBuilder()
                .setCustomId(ApproveId.encode({ userId: id, action: 'approve' }))
                .setLabel('Approve');
        `,
        // a pre-encoded id held in a variable
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            declare const prevId: string;
            new ButtonBuilder()
                .setCustomId(prevId)
                .setStyle(ButtonStyle.Secondary);
        `,
        // a conditional of named constants
        dedent`
            import { ButtonBuilder } from 'discord.js';
            declare const button: ButtonBuilder;
            declare const disabled: boolean;
            declare const CONFIRM_IDS: { confirm: string; cancel: string };
            button.setCustomId(disabled ? CONFIRM_IDS.cancel : CONFIRM_IDS.confirm);
        `,
        // a helper that returns an encoded id
        dedent`
            import { ButtonBuilder } from 'discord.js';
            declare const button: ButtonBuilder;
            declare const buildId: (id: string) => string;
            declare const userId: string;
            button.setCustomId(buildId(userId));
        `,
        // a string literal on a different setter is not our target
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            new ButtonBuilder()
                .setLabel('Approve')
                .setStyle(ButtonStyle.Primary);
        `,
        // a non-builder object with a setCustomId method is not a discord.js component
        dedent`
            class AriaWidget {
                setCustomId(id: string): this {
                    return this;
                }
            }
            new AriaWidget().setCustomId('search-box');
        `,
        // a variable holding an encoded id resolves to a call, that is the codec path
        dedent`
            import { ButtonBuilder } from 'discord.js';
            declare const ApproveId: { encode(data: object): string };
            const id = ApproveId.encode({ action: 'approve' });
            new ButtonBuilder().setCustomId(id);
        `,
        // a reassigned variable, its initializer is dead, so it is skipped
        dedent`
            import { ButtonBuilder } from 'discord.js';
            declare const encoded: string;
            let id = 'raw';
            id = encoded;
            new ButtonBuilder().setCustomId(id);
        `
    ],
    invalid: [
        {
            code: dedent`
                import { ButtonBuilder } from 'discord.js';
                new ButtonBuilder().setCustomId('approve').setLabel('Approve');
            `,
            errors: [{ messageId: 'rawCustomId' }]
        },
        {
            // hand-rolled dynamic id through interpolation
            code: dedent`import { ButtonBuilder } from 'discord.js';
                    declare const text: string;
                    new ButtonBuilder()
                        .setCustomId(\`go:\${text}\`)
                        .setLabel('Go');
            `,
            errors: [{ messageId: 'rawCustomId' }]
        },
        {
            // string concatenation is a hand-rolled id
            code: dedent`
                import { ButtonBuilder } from 'discord.js';
                declare const button: ButtonBuilder;
                declare const userId: string;
                button.setCustomId('approve:' + userId);
            `,
            errors: [{ messageId: 'rawCustomId' }]
        },
        {
            code: dedent`
                import { StringSelectMenuBuilder } from 'discord.js';
                new StringSelectMenuBuilder().setCustomId('pick-role');
            `,
            errors: [{ messageId: 'rawCustomId' }]
        },
        {
            code: dedent`
                import { ModalBuilder } from 'discord.js';
                new ModalBuilder().setCustomId('feedback-modal').setTitle('Feedback');
            `,
            errors: [{ messageId: 'rawCustomId' }]
        },
        {
            // seedcord button, this.instance.setCustomId with a raw literal
            code: dedent`
                import { BuilderComponent } from './seedcord';
                class ApproveButton extends BuilderComponent<'button'> {
                    constructor() {
                        super('button');
                        this.instance.setCustomId('approve');
                    }
                }
            `,
            errors: [{ messageId: 'rawCustomId' }]
        },
        {
            // an "as" cast wrapping a raw literal must still be caught
            code: dedent`
                import { ButtonBuilder } from 'discord.js';
                new ButtonBuilder().setCustomId('approve' as string).setLabel('Approve');
            `,
            errors: [{ messageId: 'rawCustomId' }]
        },
        {
            // a "satisfies" wrapping a raw literal must still be caught
            code: dedent`
                import { ButtonBuilder } from 'discord.js';
                new ButtonBuilder().setCustomId('approve' satisfies string).setLabel('Approve');
            `,
            errors: [{ messageId: 'rawCustomId' }]
        },
        {
            // the angle-bracket assertion form
            code: dedent`
                import { ButtonBuilder } from 'discord.js';
                new ButtonBuilder().setCustomId(<string>'approve').setLabel('Approve');
            `,
            errors: [{ messageId: 'rawCustomId' }]
        },
        {
            // a variable holding a raw literal is still a hand-written id
            code: dedent`
                import { ButtonBuilder } from 'discord.js';
                const id = 'confirm:yes';
                new ButtonBuilder().setCustomId(id);
            `,
            errors: [{ messageId: 'rawCustomId' }]
        },
        {
            // a variable holding a hand-rolled template
            code: dedent`
                import { ButtonBuilder } from 'discord.js';
                declare const userId: string;
                const id = \`approve:\${userId}\`;
                new ButtonBuilder().setCustomId(id);
            `,
            errors: [{ messageId: 'rawCustomId' }]
        },
        // coverage for the remaining CUSTOM_ID_BUILDERS
        {
            code: dedent`
                import { UserSelectMenuBuilder } from 'discord.js';
                new UserSelectMenuBuilder().setCustomId('pick-user');
            `,
            errors: [{ messageId: 'rawCustomId' }]
        },
        {
            code: dedent`
                import { RoleSelectMenuBuilder } from 'discord.js';
                new RoleSelectMenuBuilder().setCustomId('pick-role');
            `,
            errors: [{ messageId: 'rawCustomId' }]
        },
        {
            code: dedent`
                import { ChannelSelectMenuBuilder } from 'discord.js';
                new ChannelSelectMenuBuilder().setCustomId('pick-channel');
            `,
            errors: [{ messageId: 'rawCustomId' }]
        },
        {
            code: dedent`
                import { MentionableSelectMenuBuilder } from 'discord.js';
                new MentionableSelectMenuBuilder().setCustomId('pick-mentionable');
            `,
            errors: [{ messageId: 'rawCustomId' }]
        },
        {
            code: dedent`
                import { TextInputBuilder } from 'discord.js';
                new TextInputBuilder().setCustomId('feedback-input');
            `,
            errors: [{ messageId: 'rawCustomId' }]
        }
    ]
});
