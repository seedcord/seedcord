import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import rule from '../../../src/rules/discord/no-djs-builder-import';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('no-djs-builder-import', rule, {
    valid: [
        // builders from the correct package
        `import { EmbedBuilder } from '@discordjs/builders';`,
        // a non-builder from discord.js is fine
        `import { Client } from 'discord.js';`,
        // a namespace used for a non-builder
        `import * as Djs from 'discord.js';
new Djs.Client();`,
        // a type-only import is erased, so no CJS copy reaches runtime
        `import type { EmbedBuilder } from 'discord.js';`,
        `import { type ButtonBuilder } from 'discord.js';`
    ],
    invalid: [
        {
            code: `import { EmbedBuilder } from 'discord.js';`,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            // an alias does not hide the source
            code: `import { EmbedBuilder as EB } from 'discord.js';`,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            // namespace member access
            code: `import * as Djs from 'discord.js';
new Djs.ButtonBuilder();`,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            // re-export from discord.js
            code: `export { ContainerBuilder } from 'discord.js';`,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            // require destructure
            code: `const { EmbedBuilder } = require('discord.js');`,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            // require member access
            code: `const Button = require('discord.js').ButtonBuilder;`,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            // dynamic import destructure
            code: `async function load() {
    const { EmbedBuilder } = await import('discord.js');
    return EmbedBuilder;
}`,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            // dynamic import member access
            code: `async function load() {
    return (await import('discord.js')).SectionBuilder;
}`,
            errors: [{ messageId: 'useBuildersPkg' }]
        }
    ]
});
