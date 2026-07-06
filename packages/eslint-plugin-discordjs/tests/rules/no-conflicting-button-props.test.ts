import dedent from 'dedent';

import rule from '../../src/rules/no-conflicting-button-props';
import { createTypedRuleTester } from '../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('no-conflicting-button-props', rule, {
    valid: [
        // a normal button, customId only
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            new ButtonBuilder()
                .setCustomId('approve')
                .setLabel('Approve')
                .setStyle(ButtonStyle.Primary);
        `,
        // a link button, url only
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setURL('https://example.com')
                .setLabel('Docs');
        `,
        // a non-link button with a customId, no url
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            new ButtonBuilder()
                .setLabel('x')
                .setStyle(ButtonStyle.Secondary)
                .setCustomId('y');
        `,
        // props split across statements are on separate chains
        dedent`
            import { ButtonBuilder } from 'discord.js';
            const b = new ButtonBuilder().setCustomId('x');
            b.setURL('https://example.com');
        `,
        // a non-button object with the same method names is not a discord.js button
        dedent`
            class CustomCard {
                setCustomId(id: string): this {
                    return this;
                }
                setURL(url: string): this {
                    return this;
                }
            }
            new CustomCard().setCustomId('card').setURL('https://example.com');
        `,
        // a local enum sharing the ButtonStyle name resolves to its own value, 1 is not the link style
        dedent`
            import { ButtonBuilder } from 'discord.js';
            enum ButtonStyle { Link = 1 }
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setCustomId('x');
        `
    ],
    invalid: [
        {
            code: dedent`
                import { ButtonBuilder } from 'discord.js';
                new ButtonBuilder()
                    .setCustomId('x')
                    .setURL('https://example.com')
                    .setLabel('y');
            `,
            errors: [{ messageId: 'idAndUrl' }]
        },
        {
            code: dedent`
                import { ButtonBuilder, ButtonStyle } from 'discord.js';
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setCustomId('x')
                    .setLabel('y');
            `,
            errors: [{ messageId: 'linkWithCustomId' }]
        },
        {
            // seedcord BuilderComponent, this.instance is the ButtonBuilder
            code: dedent`
                import { BuilderComponent } from './seedcord';
                class ApproveButton extends BuilderComponent<'button'> {
                    constructor() {
                        super('button');
                        this.instance
                            .setCustomId('x')
                            .setURL('https://example.com');
                    }
                }
            `,
            errors: [{ messageId: 'idAndUrl' }]
        },
        {
            // the raw ButtonStyle.Link enum value 5 with a customId
            code: dedent`
                import { ButtonBuilder } from 'discord.js';
                new ButtonBuilder()
                    .setStyle(5)
                    .setCustomId('x');
            `,
            errors: [{ messageId: 'linkWithCustomId' }]
        },
        {
            // seedcord button, this.instance sets the Link style with a customId
            code: dedent`
                import { ButtonStyle } from 'discord.js';
                import { BuilderComponent } from './seedcord';
                class LinkButton extends BuilderComponent<'button'> {
                    constructor() {
                        super('button');
                        this.instance
                            .setStyle(ButtonStyle.Link)
                            .setCustomId('x');
                    }
                }
            `,
            errors: [{ messageId: 'linkWithCustomId' }]
        },
        {
            // ButtonStyle.Link stored in a const - the type resolves to the numeric literal 5
            code: dedent`
                import { ButtonBuilder, ButtonStyle } from 'discord.js';
                const linkStyle = ButtonStyle.Link;
                new ButtonBuilder()
                    .setStyle(linkStyle)
                    .setCustomId('x');
            `,
            errors: [{ messageId: 'linkWithCustomId' }]
        }
    ]
});
