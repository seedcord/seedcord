import dedent from 'dedent';

import rule from '../../../src/rules/seedcord/use-custom-id-codec';
import { createTypedRuleTester } from '../../typed-rule-tester';

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
        }
    ]
});
