import rule from '../../../src/rules/discord/no-content-with-v2-components';
import { createTypedRuleTester } from '../../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('no-content-with-v2-components', rule, {
    valid: [
        // v2 components with no content or embeds
        `import { ContainerBuilder } from 'discord.js';
const payload = { components: [new ContainerBuilder()] };`,
        // content with a traditional action row, not a v2 component
        `import { ActionRowBuilder } from 'discord.js';
const payload = { content: 'hi', components: [new ActionRowBuilder()] };`,
        // content and embeds with no components at all
        `const payload = { content: 'hi', embeds: [] };`
    ],
    invalid: [
        {
            code: `import { ContainerBuilder } from 'discord.js';
const payload = { content: 'hi', components: [new ContainerBuilder()] };`,
            errors: [{ messageId: 'v2WithContent' }]
        },
        {
            code: `import { ContainerBuilder, EmbedBuilder } from 'discord.js';
const payload = { embeds: [new EmbedBuilder()], components: [new ContainerBuilder()] };`,
            errors: [{ messageId: 'v2WithContent' }]
        },
        {
            // a v2 component reached through a seedcord container's .component getter
            code: `import { BuilderComponent } from './seedcord';
declare const card: BuilderComponent<'container'>;
const payload = { content: 'hi', components: [card.component] };`,
            errors: [{ messageId: 'v2WithContent' }]
        },
        {
            code: `import { SectionBuilder } from 'discord.js';
const payload = { content: 'x', components: [new SectionBuilder()] };`,
            errors: [{ messageId: 'v2WithContent' }]
        }
    ]
});
