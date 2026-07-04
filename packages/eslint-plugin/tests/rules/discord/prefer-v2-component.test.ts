import dedent from 'dedent';

import rule from '../../../src/rules/discord/prefer-v2-component';
import { createTypedRuleTester } from '../../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('prefer-v2-component', rule, {
    valid: [
        // a components v2 builder, the preferred layout
        dedent`
            import { ContainerBuilder } from 'discord.js';
            new ContainerBuilder();
        `,
        // an action row is used inside a v2 layout, not a legacy embed
        dedent`
            import { ActionRowBuilder } from 'discord.js';
            new ActionRowBuilder();
        `,
        // a seedcord container component exposes a ContainerBuilder, not an embed
        dedent`
            import { BuilderComponent } from './seedcord';
            class MyCard extends BuilderComponent<'container'> {
                constructor() {
                    super('container');
                }
            }
        `,
        // a local class named EmbedBuilder is not the discord.js one
        dedent`
            class EmbedBuilder {
                render(): string {
                    return '';
                }
            }
            new EmbedBuilder();
        `
    ],
    invalid: [
        {
            code: dedent`
                import { EmbedBuilder } from 'discord.js';
                new EmbedBuilder();
            `,
            errors: [{ messageId: 'preferV2' }]
        },
        {
            // an aliased import still resolves to EmbedBuilder through its type
            code: dedent`
                import { EmbedBuilder as Embed } from 'discord.js';
                new Embed();
            `,
            errors: [{ messageId: 'preferV2' }]
        },
        {
            // a seedcord embed component exposes an EmbedBuilder through .component
            code: dedent`
                import { BuilderComponent } from './seedcord';
                class MyEmbed extends BuilderComponent<'embed'> {
                    constructor() {
                        super('embed');
                    }
                }
            `,
            errors: [{ messageId: 'preferV2' }]
        },
        {
            // EmbedBuilder.from() is a static factory that still builds an embed
            code: dedent`
                import { EmbedBuilder } from 'discord.js';
                declare const data: object;
                EmbedBuilder.from(data);
            `,
            errors: [{ messageId: 'preferV2' }]
        }
    ]
});
