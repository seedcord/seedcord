import dedent from 'dedent';

import rule from '../../../src/rules/seedcord/no-djs-builder-import';
import { createRuleTester } from '../../typed-rule-tester';

const ruleTester = createRuleTester();

ruleTester.run('no-djs-builder-import', rule, {
    valid: [
        `import { EmbedBuilder } from '@discordjs/builders';`,
        `import { Client } from 'discord.js';`,
        dedent`
            import * as Djs from 'discord.js';
            new Djs.Client();
        `,
        // a type-only import or re-export is erased, so no CJS copy reaches runtime
        `import type { EmbedBuilder } from 'discord.js';`,
        `import { type ButtonBuilder } from 'discord.js';`,
        `export type { EmbedBuilder } from 'discord.js';`,
        // non-builder re-export: Client is not in the builder set
        `export { Client } from 'discord.js';`,
        // function param named Djs shadows the namespace import; the access is not from discord.js
        dedent`
            import * as Djs from 'discord.js';
            function inspect(Djs: { EmbedBuilder: string }) { return Djs.EmbedBuilder; }
        `
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
            // two builders in one import, one error each
            code: `import { EmbedBuilder, ButtonBuilder } from 'discord.js';`,
            errors: [{ messageId: 'useBuildersPkg' }, { messageId: 'useBuildersPkg' }]
        },
        {
            code: dedent`
                import * as Djs from 'discord.js';
                new Djs.ButtonBuilder();
            `,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            code: `export { ContainerBuilder } from 'discord.js';`,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            code: `const { EmbedBuilder } = require('discord.js');`,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            code: `const Button = require('discord.js').ButtonBuilder;`,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            code: dedent`
                async function load() {
                    const { EmbedBuilder } = await import('discord.js');
                    return EmbedBuilder;
                }
            `,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            code: dedent`
                async function load() {
                    return (await import('discord.js')).SectionBuilder;
                }
            `,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            // a .then callback destructures the module
            code: `import('discord.js').then(({ EmbedBuilder }) => new EmbedBuilder());`,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            // mixed re-export: only the builder is flagged, Client is not
            code: `export { EmbedBuilder, Client } from 'discord.js';`,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            // named (non-destructured) then-callback param used as a namespace
            code: `import('discord.js').then((djs) => { new djs.EmbedBuilder(); })`,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            // require bound to a plain identifier, then a member access
            code: dedent`
                const djs = require('discord.js');
                new djs.EmbedBuilder();
            `,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            // a wildcard re-export pulls in the CJS builders
            code: `export * from 'discord.js';`,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            // an aliased re-export does not hide the builder
            code: `export { EmbedBuilder as Embed } from 'discord.js';`,
            errors: [{ messageId: 'useBuildersPkg' }]
        },
        {
            // a function-expression then-callback, named param used as a namespace
            code: `import('discord.js').then(function (djs) { new djs.EmbedBuilder(); })`,
            errors: [{ messageId: 'useBuildersPkg' }]
        }
    ]
});
