import dedent from 'dedent';

import rule from '../../src/rules/require-button-props';
import { createTypedRuleTester } from '../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('require-button-props', rule, {
    valid: [
        // a complete link button
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setURL('https://example.com')
                .setLabel('Docs');
        `,
        // a dynamic style is unknowable, and so are its requirements
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            declare const style: ButtonStyle;
            new ButtonBuilder().setStyle(style).setLabel('x');
        `,
        // constructor data carries the customId
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            new ButtonBuilder({ custom_id: 'x' })
                .setStyle(ButtonStyle.Danger)
                .setLabel('Delete');
        `,
        // discord.js snake_cases camelCase data at construction
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            new ButtonBuilder({ customId: 'confirm', style: ButtonStyle.Danger, label: 'Delete' });
        `,
        // an unreadable data argument can carry any prop
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            import type { APIButtonComponent } from 'discord.js';
            declare const data: Partial<APIButtonComponent>;
            new ButtonBuilder(data).setStyle(ButtonStyle.Danger);
        `,
        // a spread inside the data literal can carry any prop
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            declare const base: { label: string };
            new ButtonBuilder({ ...base, style: ButtonStyle.Danger, custom_id: 'x' });
        `,
        // a .from() copy starts with the source's props
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            declare const base: ButtonBuilder;
            ButtonBuilder.from(base).setStyle(ButtonStyle.Link);
        `,
        // a base fed to from() is a template, its copies carry the completion
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            const base = new ButtonBuilder().setStyle(ButtonStyle.Secondary);
            ButtonBuilder.from(base).setCustomId('x').setLabel('y');
        `,
        // a subclass constructor can set props of its own
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            class NavButton extends ButtonBuilder {
                constructor() {
                    super({ custom_id: 'nav' });
                }
            }
            new NavButton().setStyle(ButtonStyle.Secondary).setLabel('x');
        `,
        // a later statement completes the builder
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            const b = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel('x');
            b.setCustomId('y');
        `,
        // every prop arrives through statement chains on the variable
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            const b = new ButtonBuilder();
            b.setStyle(ButtonStyle.Danger).setLabel('x');
            b.setCustomId('y');
        `,
        // a function taking the builder can add props the rule cannot read
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            declare function finish(b: ButtonBuilder): void;
            const b = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel('x');
            finish(b);
        `,
        // same for the chain handed to a function inline
        dedent`
            import { ButtonBuilder, ButtonStyle } from 'discord.js';
            declare function wrap(b: ButtonBuilder): ButtonBuilder;
            wrap(new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel('x'));
        `
    ],
    invalid: [
        {
            code: dedent`
                import { ButtonBuilder, ButtonStyle } from 'discord.js';
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel('Docs');
            `,
            errors: [{ messageId: 'missingUrl' }]
        },
        {
            code: dedent`
                import { ButtonBuilder, ButtonStyle } from 'discord.js';
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Premium);
            `,
            errors: [{ messageId: 'missingSkuId' }]
        },
        {
            code: dedent`
                import { ButtonBuilder, ButtonStyle } from 'discord.js';
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Danger)
                    .setLabel('Delete');
            `,
            errors: [{ messageId: 'missingCustomId', data: { style: 'Danger' } }]
        },
        {
            // builders reject a label-less, emoji-less button at toJSON
            code: dedent`
                import { ButtonBuilder, ButtonStyle } from 'discord.js';
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://example.com');
            `,
            errors: [{ messageId: 'missingLabel', data: { style: 'Link' } }]
        },
        {
            // style never set from any source, the API requires one
            code: dedent`
                import { ButtonBuilder } from 'discord.js';
                new ButtonBuilder().setLabel('x');
            `,
            errors: [{ messageId: 'missingStyle' }]
        },
        {
            // both gaps report, one per missing prop
            code: dedent`
                import { ButtonBuilder, ButtonStyle } from 'discord.js';
                new ButtonBuilder().setStyle(ButtonStyle.Danger);
            `,
            errors: [
                { messageId: 'missingCustomId', data: { style: 'Danger' } },
                { messageId: 'missingLabel', data: { style: 'Danger' } }
            ]
        },
        {
            // no later statement completes the exported builder
            code: dedent`
                import { ButtonBuilder, ButtonStyle } from 'discord.js';
                export const btn = new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://example.com');
            `,
            errors: [{ messageId: 'missingLabel', data: { style: 'Link' } }]
        },
        {
            // a named re-export is the same case as export const
            code: dedent`
                import { ButtonBuilder, ButtonStyle } from 'discord.js';
                const btn = new ButtonBuilder().setStyle(ButtonStyle.Link).setURL('https://example.com');
                export { btn };
            `,
            errors: [{ messageId: 'missingLabel', data: { style: 'Link' } }]
        },
        {
            code: dedent`
                import { ButtonBuilder, ButtonStyle } from 'discord.js';
                const btn = new ButtonBuilder().setStyle(ButtonStyle.Link).setURL('https://example.com');
                export default btn;
            `,
            errors: [{ messageId: 'missingLabel', data: { style: 'Link' } }]
        },
        {
            // discord.js consumption seals the builder as-is
            code: dedent`
                import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
                declare const row: ActionRowBuilder<ButtonBuilder>;
                const b = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel('x');
                row.addComponents(b);
            `,
            errors: [{ messageId: 'missingCustomId', data: { style: 'Danger' } }]
        },
        {
            code: dedent`
                import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel('x')
                );
            `,
            errors: [{ messageId: 'missingCustomId', data: { style: 'Danger' } }]
        }
    ]
});
