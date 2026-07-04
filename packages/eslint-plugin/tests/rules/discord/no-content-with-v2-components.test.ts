import dedent from 'dedent';

import rule from '../../../src/rules/discord/no-content-with-v2-components';
import { createTypedRuleTester } from '../../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('no-content-with-v2-components', rule, {
    valid: [
        // v2 components with no content or embeds
        dedent`
            import { ContainerBuilder } from 'discord.js';
            const payload = { components: [new ContainerBuilder()] };
        `,
        // content with a traditional action row, not a v2 component
        dedent`
            import { ActionRowBuilder } from 'discord.js';
            const payload = { content: 'hi', components: [new ActionRowBuilder()] };
        `,
        // content and embeds with no components at all
        `const payload = { content: 'hi', embeds: [] };`,
        // a local class named like a v2 builder is not the discord.js one
        dedent`
            class SectionBuilder {}
            const payload = { content: 'x', components: [new SectionBuilder()] };
        `
    ],
    invalid: [
        {
            code: dedent`
                import { ContainerBuilder } from 'discord.js';
                const payload = { content: 'hi', components: [new ContainerBuilder()] };
            `,
            errors: [{ messageId: 'v2WithContent' }]
        },
        {
            code: dedent`
                import { ContainerBuilder, EmbedBuilder } from 'discord.js';
                const payload = { embeds: [new EmbedBuilder()], components: [new ContainerBuilder()] };
            `,
            errors: [{ messageId: 'v2WithContent' }]
        },
        {
            // a v2 component reached through a seedcord container's .component getter
            code: dedent`
                import { BuilderComponent } from './seedcord';
                declare const card: BuilderComponent<'container'>;
                const payload = { content: 'hi', components: [card.component] };
            `,
            errors: [{ messageId: 'v2WithContent' }]
        },
        {
            code: dedent`
                import { SectionBuilder } from 'discord.js';
                const payload = { content: 'x', components: [new SectionBuilder()] };
            `,
            errors: [{ messageId: 'v2WithContent' }]
        },
        {
            code: dedent`
                import { TextDisplayBuilder } from 'discord.js';
                const payload = { content: 'x', components: [new TextDisplayBuilder()] };
            `,
            errors: [{ messageId: 'v2WithContent' }]
        },
        {
            code: dedent`
                import { MediaGalleryBuilder } from 'discord.js';
                const payload = { content: 'x', components: [new MediaGalleryBuilder()] };
            `,
            errors: [{ messageId: 'v2WithContent' }]
        },
        {
            code: dedent`
                import { FileBuilder } from 'discord.js';
                const payload = { content: 'x', components: [new FileBuilder()] };
            `,
            errors: [{ messageId: 'v2WithContent' }]
        },
        {
            code: dedent`
                import { SeparatorBuilder } from 'discord.js';
                const payload = { content: 'x', components: [new SeparatorBuilder()] };
            `,
            errors: [{ messageId: 'v2WithContent' }]
        },
        {
            // a v2 component stored in a variable is still a v2 component
            code: dedent`
                import { ContainerBuilder } from 'discord.js';
                const comps = [new ContainerBuilder()];
                const payload = { content: 'hi', components: comps };
            `,
            errors: [{ messageId: 'v2WithContent' }]
        },
        {
            // union element type: exercises the isUnion branch in isV2Type
            code: dedent`
                import { ContainerBuilder, ActionRowBuilder } from 'discord.js';
                declare const comps: Array<ContainerBuilder | ActionRowBuilder>;
                const payload = { content: 'hi', components: comps };
            `,
            errors: [{ messageId: 'v2WithContent' }]
        },
        {
            // spread of a v2 array into the inline components list must still be flagged
            code: dedent`
                import { ContainerBuilder } from 'discord.js';
                declare const v2arr: ContainerBuilder[];
                const payload = { content: 'hi', components: [...v2arr] };
            `,
            errors: [{ messageId: 'v2WithContent' }]
        }
    ]
});
