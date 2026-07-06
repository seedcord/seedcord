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
        `,
        // a style only known at runtime stays unflagged
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            declare const style: ButtonStyle;
            new ButtonBuilder()
                .setStyle(style)
                .setURL('https://example.com')
                .setLabel('y');
        `,
        // a premium button, skuId only
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            new ButtonBuilder()
                .setStyle(ButtonStyle.Premium)
                .setSKUId('123')
                .setDisabled(true);
        `,
        // a subclass constructor argument is not API data
        dedent`
            import { ButtonBuilder } from 'discord.js';
            class NavButton extends ButtonBuilder {
                constructor(opts: { url: string; custom_id: string }) {
                    super();
                    void opts;
                }
            }
            new NavButton({ url: 'https://example.com', custom_id: 'x' });
        `,
        // the last setStyle wins, and it moves the button off the Link style
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setStyle(ButtonStyle.Primary)
                .setCustomId('x')
                .setLabel('y');
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
                    .setStyle(ButtonStyle.Danger)
                    .setURL('https://example.com')
                    .setLabel('y');
            `,
            errors: [{ messageId: 'urlOnNonLink', data: { style: 'Danger' } }]
        },
        {
            code: dedent`
                import { ButtonBuilder, ButtonStyle } from 'discord.js';
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Secondary)
                    .setCustomId('x')
                    .setLabel('y')
                    .setSKUId('123');
            `,
            errors: [{ messageId: 'skuIdOnNonPremium', data: { style: 'Secondary' } }]
        },
        {
            code: dedent`
                import { ButtonBuilder, ButtonStyle } from 'discord.js';
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Premium)
                    .setSKUId('123')
                    .setLabel('y')
                    .setEmoji({ name: 'x' });
            `,
            errors: [
                { messageId: 'premiumProp', data: { prop: 'label' } },
                { messageId: 'premiumProp', data: { prop: 'emoji' } }
            ]
        },
        {
            // constructor data carries the same state as the setters
            code: dedent`
                import { ButtonBuilder } from 'discord.js';
                new ButtonBuilder({ custom_id: 'x', label: 'y' })
                    .setURL('https://example.com');
            `,
            errors: [{ messageId: 'idAndUrl' }]
        },
        {
            code: dedent`
                import { ButtonBuilder, ButtonStyle } from 'discord.js';
                new ButtonBuilder({ style: ButtonStyle.Success, label: 'y' })
                    .setURL('https://example.com');
            `,
            errors: [{ messageId: 'urlOnNonLink', data: { style: 'Success' } }]
        },
        {
            // no chain at all, the conflict sits entirely in the constructor
            code: dedent`
                import { ButtonBuilder } from 'discord.js';
                new ButtonBuilder({ custom_id: 'x', url: 'https://example.com', label: 'y' });
            `,
            errors: [{ messageId: 'idAndUrl' }]
        },
        {
            // discord.js snake_cases camelCase data at construction
            code: dedent`
                import { ButtonBuilder } from 'discord.js';
                new ButtonBuilder({ customId: 'x', label: 'y' }).setURL('https://example.com');
            `,
            errors: [{ messageId: 'idAndUrl' }]
        },
        {
            // skuId with any premium-forbidden prop throws under every style
            code: dedent`
                import { ButtonBuilder } from 'discord.js';
                new ButtonBuilder().setSKUId('123').setCustomId('x');
            `,
            errors: [{ messageId: 'skuIdWithProp', data: { prop: 'customId' } }]
        },
        {
            // the chained setStyle runs after the constructor and wins
            code: dedent`
                import { ButtonBuilder, ButtonStyle } from 'discord.js';
                new ButtonBuilder({ style: ButtonStyle.Primary })
                    .setStyle(ButtonStyle.Link)
                    .setCustomId('x')
                    .setLabel('y');
            `,
            errors: [{ messageId: 'linkWithCustomId' }]
        },
        {
            // a wire value outside the six styles counts as unknown, and the style-independent
            // skuId pair still reports
            code: dedent`
                import { ButtonBuilder } from 'discord.js';
                new ButtonBuilder().setStyle(7).setSKUId('123').setLabel('x');
            `,
            errors: [{ messageId: 'skuIdWithProp', data: { prop: 'label' } }]
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
            // ButtonStyle.Link stored in a const, the type resolves to the numeric literal 5
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
