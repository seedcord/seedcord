import rule from '../../../src/rules/seedcord/no-raw-client-events';
import { createTypedRuleTester } from '../../typed-rule-tester';

const ruleTester = createTypedRuleTester();

ruleTester.run('no-raw-client-events', rule, {
    valid: [
        // a non-Client emitter is not the framework's concern
        `declare const emitter: { on(event: string, listener: () => void): void };
emitter.on('messageCreate', () => {});`,
        // a client meta event, left alone
        `import { Client } from 'discord.js';
declare const client: Client;
client.on('error', () => {});`,
        // interactionCreate routes through the interaction dispatcher, not @RegisterEvent
        `import { Client } from 'discord.js';
declare const client: Client;
client.on('interactionCreate', () => {});`,
        // a dynamic event name cannot be classified
        `import { Client } from 'discord.js';
declare const client: Client;
declare const evt: string;
client.on(evt, () => {});`
    ],
    invalid: [
        {
            code: `import { Client } from 'discord.js';
declare const client: Client;
client.on('messageCreate', () => {});`,
            errors: [{ messageId: 'rawEvent' }]
        },
        {
            code: `import { Client } from 'discord.js';
declare const client: Client;
client.once('guildCreate', () => {});`,
            errors: [{ messageId: 'rawEvent' }]
        },
        {
            // the Events enum member resolves to the same string literal type
            code: `import { Client, Events } from 'discord.js';
declare const client: Client;
client.on(Events.GuildMemberAdd, () => {});`,
            errors: [{ messageId: 'rawEvent' }]
        }
    ]
});
