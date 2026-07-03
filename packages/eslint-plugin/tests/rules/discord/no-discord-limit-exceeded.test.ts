import rule from '../../../src/rules/discord/no-discord-limit-exceeded';
import { createTypedRuleTester } from '../../typed-rule-tester';

const objs = (n: number): string => Array.from({ length: n }, () => '{}').join(', ');

const ruleTester = createTypedRuleTester();

ruleTester.run('no-discord-limit-exceeded', rule, {
    valid: [
        // an action row exactly at its cap of 5
        `import { ActionRowBuilder } from 'discord.js';
new ActionRowBuilder().addComponents({}, {}, {}, {}, {});`,
        // dynamic construction, the count is a runtime value, left alone
        `import { ActionRowBuilder } from 'discord.js';
declare const items: unknown[];
new ActionRowBuilder().addComponents(...items);`,
        // five variable buttons is exactly the cap, real values not literals
        `import { ActionRowBuilder, ButtonBuilder } from 'discord.js';
declare const btn: ButtonBuilder;
new ActionRowBuilder().addComponents(btn, btn, btn, btn, btn);`,
        // select and embed exactly at their cap of 25
        `import { StringSelectMenuBuilder } from 'discord.js';
new StringSelectMenuBuilder().addOptions(${objs(25)});`,
        `import { EmbedBuilder } from 'discord.js';
new EmbedBuilder().addFields(${objs(25)});`,
        // seedcord embed built through this.instance, exactly at the cap
        `import { BuilderComponent } from './seedcord';
class MyEmbed extends BuilderComponent<'embed'> {
    constructor() {
        super('embed');
        this.instance.addFields(${objs(25)});
    }
}`
    ],
    invalid: [
        {
            code: `import { ActionRowBuilder } from 'discord.js';
new ActionRowBuilder().addComponents({}, {}, {}, {}, {}, {});`,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            // two calls summing past the cap
            code: `import { ActionRowBuilder } from 'discord.js';
new ActionRowBuilder().addComponents({}, {}, {}).addComponents({}, {}, {});`,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            code: `import { StringSelectMenuBuilder } from 'discord.js';
new StringSelectMenuBuilder().addOptions(${objs(26)});`,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            code: `import { EmbedBuilder } from 'discord.js';
new EmbedBuilder().setFields([${objs(26)}]);`,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            code: `import { SlashCommandStringOption } from 'discord.js';
new SlashCommandStringOption().addChoices(${objs(26)});`,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            // a variable receiver, resolved through its type, over the cap
            code: `import { ActionRowBuilder } from 'discord.js';
declare const row: ActionRowBuilder;
row.addComponents({}, {}, {}, {}, {}, {});`,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            // six variable buttons still count as six, over the cap
            code: `import { ActionRowBuilder, ButtonBuilder } from 'discord.js';
declare const btn: ButtonBuilder;
new ActionRowBuilder().addComponents(btn, btn, btn, btn, btn, btn);`,
            errors: [{ messageId: 'tooMany' }]
        },
        {
            // seedcord row, this.instance resolves to ActionRowBuilder, over the 5 cap
            code: `import { RowComponent } from './seedcord';
class MyRow extends RowComponent<'button'> {
    constructor() {
        super('button');
        this.instance.addComponents({}, {}, {}, {}, {}, {});
    }
}`,
            errors: [{ messageId: 'tooMany' }]
        }
    ]
});
