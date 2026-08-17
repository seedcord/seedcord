import dedent from 'dedent';

import rule from '#src/rules/no-mixed-message-format';

import { createTypedRuleTester } from '../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('no-mixed-message-format', rule, {
    valid: [
        // v2 components with no content or embeds
        dedent`
            import { ContainerBuilder } from 'discord.js';
            const payload = { components: [new ContainerBuilder()] };
        `,
        // an action row is not a v2 builder, so it can sit alongside content
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
        `,
        // a spread with no content or embeds is not a conflict
        dedent`
            import { ContainerBuilder } from 'discord.js';
            const base = { flags: 0 };
            const payload = { ...base, components: [new ContainerBuilder()] };
        `,
        // a spread type that only declares optional content fields does not set them
        dedent`
            import { ContainerBuilder } from 'discord.js';
            import type { MessageCreateOptions } from 'discord.js';
            declare const base: MessageCreateOptions;
            const payload = { ...base, components: [new ContainerBuilder()] };
        `,
        // a later components key overrides the v2 spread, so the final payload is not v2
        dedent`
            import { ContainerBuilder, ActionRowBuilder } from 'discord.js';
            const base = { components: [new ContainerBuilder()] };
            const payload = { ...base, components: [new ActionRowBuilder()], content: 'hi' };
        `,
        // a later spread overrides the v2 key with non-v2 components, the other direction
        dedent`
            import { ContainerBuilder, ActionRowBuilder } from 'discord.js';
            const base = { components: [new ActionRowBuilder()] };
            const payload = { content: 'hi', components: [new ContainerBuilder()], ...base };
        `,
        // files sit alongside v2 components, Discord permits attachments with a v2 layout
        dedent`
            import { ContainerBuilder } from 'discord.js';
            declare const file: unknown;
            const payload = { files: [file], components: [new ContainerBuilder()] };
        `,
        // a seedcord row accessory is an action row, so content next to it is fine
        dedent`
            import { RowComponent } from './seedcord';
            declare const row: RowComponent<'button'>;
            const payload = { content: 'hi', components: [row.component] };
        `,
        // an undefined value serializes to nothing, so the payload is not mixed
        dedent`
            import { ContainerBuilder } from 'discord.js';
            const payload = { content: undefined, components: [new ContainerBuilder()] };
        `,
        // same through a spread whose content type is exactly undefined
        dedent`
            import { ContainerBuilder } from 'discord.js';
            const base = { content: undefined };
            const payload = { ...base, components: [new ContainerBuilder()] };
        `
    ],
    invalid: [
        {
            code: dedent`
                import { ContainerBuilder } from 'discord.js';
                const payload = { content: 'hi', components: [new ContainerBuilder()] };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            // content and a v2 component each arrive through a separate spread
            code: dedent`
                import { ContainerBuilder } from 'discord.js';
                const c = { components: [new ContainerBuilder()] };
                const t = { content: 'hi' };
                const payload = { ...c, ...t };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            // the seedcord protected-field form inside the subclass itself
            code: dedent`
                import { BuilderComponent } from './seedcord';
                class Card extends BuilderComponent<'container'> {
                    constructor() {
                        super('container');
                    }
                    build() {
                        return { content: 'hi', components: [this.instance] };
                    }
                }
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            // a maybe-undefined value can still carry content at runtime
            code: dedent`
                import { ContainerBuilder } from 'discord.js';
                declare const maybe: string | undefined;
                const payload = { content: maybe, components: [new ContainerBuilder()] };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            // a subclass of a v2 builder resolves through its base chain
            code: dedent`
                import { ContainerBuilder } from 'discord.js';
                class MyContainer extends ContainerBuilder {}
                const payload = { content: 'hi', components: [new MyContainer()] };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            code: dedent`
                import { ContainerBuilder, EmbedBuilder } from 'discord.js';
                const payload = { embeds: [new EmbedBuilder()], components: [new ContainerBuilder()] };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            // a v2 component reached through a seedcord container's .component getter
            code: dedent`
                import { BuilderComponent } from './seedcord';
                declare const card: BuilderComponent<'container'>;
                const payload = { content: 'hi', components: [card.component] };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            code: dedent`
                import { SectionBuilder } from 'discord.js';
                const payload = { content: 'x', components: [new SectionBuilder()] };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            code: dedent`
                import { TextDisplayBuilder } from 'discord.js';
                const payload = { content: 'x', components: [new TextDisplayBuilder()] };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            code: dedent`
                import { MediaGalleryBuilder } from 'discord.js';
                const payload = { content: 'x', components: [new MediaGalleryBuilder()] };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            code: dedent`
                import { FileBuilder } from 'discord.js';
                const payload = { content: 'x', components: [new FileBuilder()] };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            code: dedent`
                import { SeparatorBuilder } from 'discord.js';
                const payload = { content: 'x', components: [new SeparatorBuilder()] };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            code: dedent`
                import { ThumbnailBuilder } from 'discord.js';
                const payload = { content: 'x', components: [new ThumbnailBuilder()] };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            // a v2 component stored in a variable is still a v2 component
            code: dedent`
                import { ContainerBuilder } from 'discord.js';
                const comps = [new ContainerBuilder()];
                const payload = { content: 'hi', components: comps };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            // union element type: exercises the isUnion branch in isV2Type
            code: dedent`
                import { ContainerBuilder, ActionRowBuilder } from 'discord.js';
                declare const comps: Array<ContainerBuilder | ActionRowBuilder>;
                const payload = { content: 'hi', components: comps };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            // spread of a v2 array into the inline components list must still be flagged
            code: dedent`
                import { ContainerBuilder } from 'discord.js';
                declare const v2arr: ContainerBuilder[];
                const payload = { content: 'hi', components: [...v2arr] };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            // content arriving through an object spread must still be flagged
            code: dedent`
                import { ContainerBuilder } from 'discord.js';
                const base = { content: 'hi' };
                const payload = { ...base, components: [new ContainerBuilder()] };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            // a poll and a builder component cannot share a message
            code: dedent`
                import { ContainerBuilder } from 'discord.js';
                declare const poll: object;
                const payload = { poll, components: [new ContainerBuilder()] };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            // so do stickers
            code: dedent`
                import { ContainerBuilder } from 'discord.js';
                declare const sticker: unknown;
                const payload = { stickers: [sticker], components: [new ContainerBuilder()] };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            // and the raw sticker_ids field
            code: dedent`
                import { ContainerBuilder } from 'discord.js';
                const payload = { sticker_ids: ['123'], components: [new ContainerBuilder()] };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        },
        {
            // the builder component can arrive through a spread while content is inline
            code: dedent`
                import { ContainerBuilder } from 'discord.js';
                const base = { components: [new ContainerBuilder()] };
                const payload = { ...base, content: 'hi' };
            `,
            errors: [{ messageId: 'mixedFormat' }]
        }
    ]
});
