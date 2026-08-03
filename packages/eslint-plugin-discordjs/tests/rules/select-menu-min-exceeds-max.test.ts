import dedent from 'dedent';

import rule from '@src/rules/select-menu-min-exceeds-max';

import { createTypedRuleTester } from '../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('select-menu-min-exceeds-max', rule, {
    valid: [
        // min below max
        dedent`
            import { StringSelectMenuBuilder } from 'discord.js';
            new StringSelectMenuBuilder().setCustomId('c').setMinValues(2).setMaxValues(5);
        `,
        // equal bounds are allowed
        dedent`
            import { StringSelectMenuBuilder } from 'discord.js';
            new StringSelectMenuBuilder().setCustomId('c').setMinValues(3).setMaxValues(3);
        `,
        // only one bound set
        dedent`
            import { StringSelectMenuBuilder } from 'discord.js';
            new StringSelectMenuBuilder().setCustomId('c').setMinValues(5);
        `,
        dedent`
            import { StringSelectMenuBuilder } from 'discord.js';
            new StringSelectMenuBuilder().setCustomId('c').setMaxValues(2);
        `,
        // a dynamic bound is not statically provable, so it is skipped
        dedent`
            import { StringSelectMenuBuilder } from 'discord.js';
            declare const n: number;
            new StringSelectMenuBuilder().setCustomId('c').setMinValues(n).setMaxValues(2);
        `,
        // a bad pair fixed by a later max override is valid
        dedent`
            import { StringSelectMenuBuilder } from 'discord.js';
            new StringSelectMenuBuilder().setCustomId('c').setMinValues(5).setMaxValues(2).setMaxValues(6);
        `,
        // a literal max that is overridden by a later min is valid
        dedent`
            import { StringSelectMenuBuilder } from 'discord.js';
            new StringSelectMenuBuilder().setCustomId('c').setMaxValues(2).setMinValues(5).setMinValues(1);
        `,
        // a literal number in a variable is still a literal type, so it is checked, and this pair is fine
        dedent`
            import { StringSelectMenuBuilder } from 'discord.js';
            const MIN = 2;
            const MAX = 5;
            new StringSelectMenuBuilder().setCustomId('c').setMinValues(MIN).setMaxValues(MAX);
        `,
        // a later setMinValues overrides the bad one
        dedent`
            import { StringSelectMenuBuilder } from 'discord.js';
            new StringSelectMenuBuilder().setCustomId('c').setMinValues(6).setMinValues(2).setMaxValues(5);
        `,
        // a local class with the same method names is not a discord.js select menu
        dedent`
            class RangePicker {
                setMinValues(n: number): this { return this; }
                setMaxValues(n: number): this { return this; }
            }
            new RangePicker().setMinValues(5).setMaxValues(2);
        `
    ],
    invalid: [
        {
            code: dedent`
                import { StringSelectMenuBuilder } from 'discord.js';
                new StringSelectMenuBuilder().setCustomId('c').setMinValues(5).setMaxValues(2);
            `,
            errors: [{ messageId: 'minOverMax' }]
        },
        {
            // both bounds in the constructor, no chain
            code: dedent`
                import { StringSelectMenuBuilder } from 'discord.js';
                new StringSelectMenuBuilder({ custom_id: 'c', min_values: 3, max_values: 2 });
            `,
            errors: [{ messageId: 'minOverMax' }]
        },
        {
            // one bound in the constructor, the other chained
            code: dedent`
                import { StringSelectMenuBuilder } from 'discord.js';
                new StringSelectMenuBuilder({ custom_id: 'c', min_values: 3 }).setMaxValues(2);
            `,
            errors: [{ messageId: 'minOverMax' }]
        },
        {
            // discord.js snake_cases camelCase data at construction
            code: dedent`
                import { StringSelectMenuBuilder } from 'discord.js';
                new StringSelectMenuBuilder({ customId: 'c', minValues: 3, maxValues: 2 });
            `,
            errors: [{ messageId: 'minOverMax' }]
        },
        {
            // max set before min, the order does not matter
            code: dedent`
                import { StringSelectMenuBuilder } from 'discord.js';
                new StringSelectMenuBuilder().setCustomId('c').setMaxValues(1).setMinValues(4);
            `,
            errors: [{ messageId: 'minOverMax' }]
        },
        {
            // every select menu kind inherits the setters from the shared base
            code: dedent`
                import { UserSelectMenuBuilder } from 'discord.js';
                new UserSelectMenuBuilder().setCustomId('c').setMinValues(3).setMaxValues(1);
            `,
            errors: [{ messageId: 'minOverMax' }]
        },
        {
            code: dedent`
                import { ChannelSelectMenuBuilder } from 'discord.js';
                new ChannelSelectMenuBuilder().setCustomId('c').setMinValues(3).setMaxValues(1);
            `,
            errors: [{ messageId: 'minOverMax' }]
        },
        {
            // const bounds resolve through their literal types
            code: dedent`
                import { StringSelectMenuBuilder } from 'discord.js';
                const MIN = 5;
                const MAX = 2;
                new StringSelectMenuBuilder().setCustomId('c').setMinValues(MIN).setMaxValues(MAX);
            `,
            errors: [{ messageId: 'minOverMax' }]
        },
        {
            // the last setMinValues wins and it exceeds the max
            code: dedent`
                import { StringSelectMenuBuilder } from 'discord.js';
                new StringSelectMenuBuilder().setCustomId('c').setMinValues(1).setMinValues(9).setMaxValues(3);
            `,
            errors: [{ messageId: 'minOverMax' }]
        },
        {
            // a variable receiver resolves through its type
            code: dedent`
                import { RoleSelectMenuBuilder } from 'discord.js';
                declare const menu: RoleSelectMenuBuilder;
                menu.setMinValues(4).setMaxValues(2);
            `,
            errors: [{ messageId: 'minOverMax' }]
        },
        {
            // a good intermediate state does not save a bad final one, the last max is 2
            code: dedent`
                import { StringSelectMenuBuilder } from 'discord.js';
                new StringSelectMenuBuilder().setCustomId('c').setMinValues(5).setMaxValues(6).setMaxValues(2);
            `,
            errors: [{ messageId: 'minOverMax' }]
        },
        {
            // the cast only lies to the checker, the runtime value is still the literal behind it
            code: dedent`
                import { StringSelectMenuBuilder } from 'discord.js';
                new StringSelectMenuBuilder().setCustomId('c').setMinValues(5 as number).setMaxValues(2);
            `,
            errors: [{ messageId: 'minOverMax' }]
        },
        {
            code: dedent`
                import { MentionableSelectMenuBuilder } from 'discord.js';
                new MentionableSelectMenuBuilder().setCustomId('c').setMinValues(3).setMaxValues(1);
            `,
            errors: [{ messageId: 'minOverMax' }]
        },
        {
            // the seedcord instance form resolves to the select builder through the component generic
            code: dedent`
                import { BuilderComponent } from './seedcord';
                class PickMenu extends BuilderComponent<'menu_string'> {
                    constructor() {
                        super('menu_string');
                        this.instance.setCustomId('pick').setMinValues(6).setMaxValues(2);
                    }
                }
            `,
            errors: [{ messageId: 'minOverMax' }]
        }
    ]
});
