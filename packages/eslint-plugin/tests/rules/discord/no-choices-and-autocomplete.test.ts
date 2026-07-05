import dedent from 'dedent';

import rule from '../../../src/rules/discord/no-choices-and-autocomplete';
import { createTypedRuleTester } from '../../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('no-choices-and-autocomplete', rule, {
    valid: [
        // autocomplete alone
        dedent`
            import { SlashCommandStringOption } from 'discord.js';
            new SlashCommandStringOption()
                .setName('q')
                .setDescription('d')
                .setAutocomplete(true);
        `,
        // choices alone
        dedent`
            import { SlashCommandStringOption } from 'discord.js';
            new SlashCommandStringOption()
                .setName('q')
                .setDescription('d')
                .addChoices({ name: 'A', value: 'a' });
        `,
        // autocomplete explicitly off, choices are fine
        dedent`
            import { SlashCommandStringOption } from 'discord.js';
            new SlashCommandStringOption()
                .setName('q')
                .setAutocomplete(false)
                .addChoices({ name: 'A', value: 'a' });
        `,
        // a plain boolean variable is not statically provable, so it is skipped
        dedent`
            import { SlashCommandStringOption } from 'discord.js';
            declare const flag: boolean;
            new SlashCommandStringOption()
                .setName('q')
                .setAutocomplete(flag)
                .addChoices({ name: 'A', value: 'a' });
        `,
        // a const false resolves through its literal type, no conflict
        dedent`
            import { SlashCommandStringOption } from 'discord.js';
            const OFF = false;
            new SlashCommandStringOption()
                .setName('q')
                .setAutocomplete(OFF)
                .addChoices({ name: 'A', value: 'a' });
        `,
        // a later setAutocomplete(false) overrides the earlier true, so there is no conflict
        dedent`
            import { SlashCommandStringOption } from 'discord.js';
            new SlashCommandStringOption()
                .setName('q')
                .setAutocomplete(true)
                .setAutocomplete(false)
                .addChoices({ name: 'A', value: 'a' });
        `,
        // props split across statements are on separate chains
        dedent`
            import { SlashCommandStringOption } from 'discord.js';
            const opt = new SlashCommandStringOption().setName('q');
            opt.setAutocomplete(true);
            opt.addChoices({ name: 'A', value: 'a' });
        `,
        // dynamic choices spread, count is not statically known
        dedent`
            import { SlashCommandStringOption } from 'discord.js';
            declare const dynamicChoices: { name: string; value: string }[];
            new SlashCommandStringOption()
                .setName('q')
                .setAutocomplete(true)
                .addChoices(...dynamicChoices);
        `,
        // dynamic setChoices spread, count is not statically known
        dedent`
            import { SlashCommandStringOption } from 'discord.js';
            declare const dynamicChoices: { name: string; value: string }[];
            new SlashCommandStringOption()
                .setName('q')
                .setAutocomplete(true)
                .setChoices(...dynamicChoices);
        `,
        // setChoices([]) clears all choices at runtime, so a following setAutocomplete(true) is safe
        dedent`
            import { SlashCommandStringOption } from 'discord.js';
            new SlashCommandStringOption()
                .setName('q')
                .addChoices({ name: 'A', value: 'a' })
                .setChoices([])
                .setAutocomplete(true);
        `,
        // a non-option object with the same method names is not a slash option
        dedent`
            class FormField {
                setAutocomplete(on: boolean): this {
                    return this;
                }
                addChoices(...choices: unknown[]): this {
                    return this;
                }
            }
            new FormField().setAutocomplete(true).addChoices({ label: 'A', value: 'a' });
        `
    ],
    invalid: [
        {
            code: dedent`
                import { SlashCommandStringOption } from 'discord.js';
                new SlashCommandStringOption()
                    .setName('q')
                    .setDescription('d')
                    .setAutocomplete(true)
                    .addChoices({ name: 'A', value: 'a' });
            `,
            errors: [{ messageId: 'bothSet' }]
        },
        {
            // a const true resolves through its literal type
            code: dedent`
                import { SlashCommandStringOption } from 'discord.js';
                const ON = true;
                new SlashCommandStringOption()
                    .setName('q')
                    .setAutocomplete(ON)
                    .addChoices({ name: 'A', value: 'a' });
            `,
            errors: [{ messageId: 'bothSet' }]
        },
        {
            // reversed order
            code: dedent`
                import { SlashCommandStringOption } from 'discord.js';
                new SlashCommandStringOption()
                    .setName('q')
                    .addChoices({ name: 'A', value: 'a' })
                    .setAutocomplete(true);
            `,
            errors: [{ messageId: 'bothSet' }]
        },
        {
            // setChoices variant on an integer option
            code: dedent`
                import { SlashCommandIntegerOption } from 'discord.js';
                new SlashCommandIntegerOption()
                    .setName('n')
                    .setAutocomplete(true)
                    .setChoices({ name: 'One', value: 1 });
            `,
            errors: [{ messageId: 'bothSet' }]
        },
        {
            // a number option, same conflict
            code: dedent`
                import { SlashCommandNumberOption } from 'discord.js';
                new SlashCommandNumberOption()
                    .setName('n')
                    .setAutocomplete(true)
                    .addChoices({ name: 'One', value: 1 });
            `,
            errors: [{ messageId: 'bothSet' }]
        },
        {
            // seedcord command, the option is built through this.instance.addStringOption
            code: dedent`
                import { BuilderComponent } from './seedcord';
                class MyCommand extends BuilderComponent<'command'> {
                    constructor() {
                        super('command');
                        this.instance.addStringOption(
                            (o) => o
                                .setName('q')
                                .setAutocomplete(true)
                                .addChoices({ name: 'A', value: 'a' })
                        );
                    }
                }
            `,
            errors: [{ messageId: 'bothSet' }]
        },
        {
            // a literal choice sitting next to a spread in setChoices still declares choices
            code: dedent`
                import { SlashCommandStringOption } from 'discord.js';
                declare const extra: { name: string; value: string }[];
                new SlashCommandStringOption()
                    .setName('q')
                    .setAutocomplete(true)
                    .setChoices([...extra, { name: 'A', value: 'a' }]);
            `,
            errors: [{ messageId: 'bothSet' }]
        }
    ]
});
