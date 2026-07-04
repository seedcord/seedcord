import dedent from 'dedent';

import rule from '../../../src/rules/discord/no-discord-limit-exceeded';
import { createTypedRuleTester } from '../../typed-rule-tester';

const objs = (n: number): string => Array.from({ length: n }, () => '{}').join(', ');

const ruleTester = createTypedRuleTester();

ruleTester.run('no-discord-limit-exceeded', rule, {
    valid: [
        // an action row exactly at its cap of 5
        dedent`
            import { ActionRowBuilder } from 'discord.js';
            new ActionRowBuilder().addComponents({}, {}, {}, {}, {});
        `,
        // dynamic construction, the count is a runtime value, left alone
        dedent`
            import { ActionRowBuilder } from 'discord.js';
            declare const items: unknown[];
            new ActionRowBuilder().addComponents(...items);
        `,
        // five variable buttons is exactly the cap, real values not literals
        dedent`
            import { ActionRowBuilder, ButtonBuilder } from 'discord.js';
            declare const btn: ButtonBuilder;
            new ActionRowBuilder().addComponents(btn, btn, btn, btn, btn);
        `,
        // setComponents replaces the prior addComponents, so the real count is 2
        dedent`
            import { ActionRowBuilder } from 'discord.js';
            new ActionRowBuilder().addComponents({}, {}, {}, {}).setComponents([{}, {}]);
        `,
        // select and embed exactly at their cap of 25
        dedent`
            import { StringSelectMenuBuilder } from 'discord.js';
            new StringSelectMenuBuilder().addOptions(${objs(25)});
        `,
        dedent`
            import { EmbedBuilder } from 'discord.js';
            new EmbedBuilder().addFields(${objs(25)});
        `,
        // seedcord embed built through this.instance, exactly at the cap
        dedent`
            import { BuilderComponent } from './seedcord';
            class MyEmbed extends BuilderComponent<'embed'> {
                constructor() {
                    super('embed');
                    this.instance.addFields(${objs(25)});
                }
            }
        `,
        // FP-01: local class named ActionRowBuilder is not from discord.js, not flagged
        dedent`
            class ActionRowBuilder {
                addComponents(...items: unknown[]): this { return this; }
            }
            new ActionRowBuilder().addComponents({}, {}, {}, {}, {}, {});
        `
    ],
    invalid: [
        {
            code: dedent`
                import { ActionRowBuilder } from 'discord.js';
                new ActionRowBuilder().addComponents({}, {}, {}, {}, {}, {});
            `,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            // two calls summing past the cap
            code: dedent`
                import { ActionRowBuilder } from 'discord.js';
                new ActionRowBuilder().addComponents({}, {}, {}).addComponents({}, {}, {});
            `,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            // setComponents resets, then addComponents appends four more, six at runtime
            code: dedent`
                import { ActionRowBuilder } from 'discord.js';
                new ActionRowBuilder().setComponents([{}, {}]).addComponents({}, {}, {}, {});
            `,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            code: dedent`
                import { StringSelectMenuBuilder } from 'discord.js';
                new StringSelectMenuBuilder().addOptions(${objs(26)});
            `,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            code: dedent`
                import { EmbedBuilder } from 'discord.js';
                new EmbedBuilder().setFields([${objs(26)}]);
            `,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            code: dedent`
                import { SlashCommandStringOption } from 'discord.js';
                new SlashCommandStringOption().addChoices(${objs(26)});
            `,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            // a variable receiver, resolved through its type, over the cap
            code: dedent`
                import { ActionRowBuilder } from 'discord.js';
                declare const row: ActionRowBuilder;
                row.addComponents({}, {}, {}, {}, {}, {});
            `,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            // six variable buttons still count as six, over the cap
            code: dedent`
                import { ActionRowBuilder, ButtonBuilder } from 'discord.js';
                declare const btn: ButtonBuilder;
                new ActionRowBuilder().addComponents(btn, btn, btn, btn, btn, btn);
            `,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            // seedcord row, this.instance resolves to ActionRowBuilder, over the 5 cap
            code: dedent`
                import { RowComponent } from './seedcord';
                class MyRow extends RowComponent<'button'> {
                    constructor() {
                        super('button');
                        this.instance.addComponents({}, {}, {}, {}, {}, {});
                    }
                }
            `,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            code: dedent`
                import { SlashCommandIntegerOption } from 'discord.js';
                new SlashCommandIntegerOption().addChoices(${objs(26)});
            `,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            code: dedent`
                import { SlashCommandNumberOption } from 'discord.js';
                new SlashCommandNumberOption().addChoices(${objs(26)});
            `,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            code: dedent`
                import { ActionRowBuilder } from 'discord.js';
                new ActionRowBuilder().setComponents([${objs(6)}]);
            `,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            // FN-16: subclass of ActionRowBuilder inherits the same limit
            code: dedent`
                import { ActionRowBuilder } from 'discord.js';
                class CompactRow extends ActionRowBuilder {}
                new CompactRow().addComponents({}, {}, {}, {}, {}, {});
            `,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            code: dedent`
                import { StringSelectMenuBuilder } from 'discord.js';
                new StringSelectMenuBuilder().setOptions([${objs(26)}]);
            `,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            code: dedent`
                import { SlashCommandStringOption } from 'discord.js';
                new SlashCommandStringOption().setChoices([${objs(26)}]);
            `,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            // MT-28: integer option setChoices over cap
            code: dedent`
                import { SlashCommandIntegerOption } from 'discord.js';
                new SlashCommandIntegerOption().setChoices([${objs(26)}]);
            `,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            // MT-28: number option setChoices over cap
            code: dedent`
                import { SlashCommandNumberOption } from 'discord.js';
                new SlashCommandNumberOption().setChoices([${objs(26)}]);
            `,
            errors: [{ messageId: 'tooMany' }]
        }
    ]
});
